import Simulation from '../models/simulationModel.js';
import axios from 'axios'; 
import mongoose from 'mongoose';

// Configurações e URLs
const { Decimal128 } = mongoose.Types; 
const ME_API_URL = 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'; 

// Mapeamento IDs Melhor Envio (PAC=1, SEDEX=2)
const SERVICE_MAP = {
    PAC: "1",
    SEDEX: "2",
};
const SERVICES_TO_FETCH = SERVICE_MAP.PAC + ',' + SERVICE_MAP.SEDEX;

export const simulateFreight = async (req, res) => {
    // Receber dados front
    const { from, to, packages, options, selected_service } = req.body; 
    
    // Validação e Limpeza
    const cepDestino = to?.postal_code?.replace(/(\D)/g, '') || ''; 
    const servicoDesejado = selected_service?.toUpperCase();

    if (!cepDestino || !servicoDesejado || !SERVICE_MAP[servicoDesejado] || !packages || packages.length === 0) {
        return res.status(400).json({ message: 'Dados incompletos: CEP, Serviço de envio ou Pacotes são obrigatórios.' });
    }

    try {
        // Verificar Cache
        const cachedSimulation = await Simulation.findOne({ 
            cep: cepDestino, 
            'results.service': servicoDesejado 
        }).sort({ date: -1 });

        if (cachedSimulation) {
            const cachedResult = cachedSimulation.results.find(r => r.service === servicoDesejado);
            
            if (cachedResult) {
                console.log(`[CACHE] Frete encontrado para ${servicoDesejado} no CEP ${cepDestino}.`);
                return res.status(200).json({ 
                    valor: cachedResult.price.toString(),
                    delivery: cachedResult.delivery
                });
            }
        }

        // Chamadar API Melhor Envio
        const payload = { 
            from, 
            to, 
            packages, 
            options: options || { receipt: false, own_hand: false }, 
            services: SERVICES_TO_FETCH,
        };
        
        console.log(`[API] Buscando frete na API do Melhor Envio para CEP ${cepDestino}...`);

        const response = await axios.post(ME_API_URL, payload, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`, 
                'User-Agent': 'Aplicação do Usuário (kaionilofreitas@gmail.com)' 
            }
        });

        const resultadosME = response.data;

        // Tratar erros API
        if (resultadosME.length === 0 || resultadosME.error || resultadosME.some(r => r.error)) {
            const mensagemErro = (resultadosME[0]?.error || resultadosME.error || "Serviço de frete não cotado para este CEP.")
                                .replace(/\./g, ''); 
            
            console.log(`[ERRO API] 400 Bad Request: ${mensagemErro}`);
            return res.status(400).json({ message: mensagemErro });
        }
        
        // Formatar resultados e salvar no cache
        const validResults = Array.isArray(resultadosME) ? resultadosME : [];

        const resultsToCache = validResults
            .filter(item => item.name && item.price)
            .map(item => ({
                service: item.name.toUpperCase(), 
                price: Decimal128.fromString(String(item.price).replace(',', '.')), 
                delivery: item.delivery.min ? `${item.delivery.min} dias` : 'Não informado'
            }));

        const freteEncontrado = resultsToCache.find(item => 
            item.service.includes(servicoDesejado)
        );

        if (!freteEncontrado) {
            return res.status(404).json({ message: `O serviço ${servicoDesejado} não está disponível para o CEP informado.` });
        }

        // Salvar resultados no DB
        const newSimulation = new Simulation({
            cep: cepDestino,
            results: resultsToCache,
        });
        await newSimulation.save();

        // Retornar valor solicitado
        res.status(200).json({ 
            valor: freteEncontrado.price.toString(),
            delivery: freteEncontrado.delivery 
        });

    } catch (error) {
        console.error("=================================================");
        console.error(`!!! ERRO CAPTURADO NO CONTROLLER !!!`);
        console.error("Mensagem:", error.message);
        console.error("Status da Resposta da API:", error.response?.status);
        console.error("Detalhe da API:", error.response?.data);
        console.error("Pilha de Erro:", error.stack);
        console.error("=================================================");
        
        const msg = error.response?.data?.error || 'Erro interno do servidor ao simular frete. Tente novamente mais tarde.';
        res.status(500).json({ message: msg });
    }
};