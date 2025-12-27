import Simulation from '../models/simulationModel.js';
import axios from 'axios'; 
import mongoose from 'mongoose';

const { Decimal128 } = mongoose.Types; 

const ME_API_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate'; 

// Mapeamento IDs (PAC=1, SEDEX=2)
const SERVICE_MAP = {
    PAC: "1",
    SEDEX: "2",
};
const SERVICES_TO_FETCH = SERVICE_MAP.PAC + ',' + SERVICE_MAP.SEDEX;

export const simulateFreight = async (req, res) => {
    // Receber dados do frontend
    const { to, packages, selected_service } = req.body; 
    
    // Limpeza do CEP de destino
    const cepDestino = to?.postal_code?.replace(/(\D)/g, '') || ''; 
    const servicoDesejado = selected_service?.toUpperCase();

    // Validação de entrada
    if (!cepDestino || !servicoDesejado || !SERVICE_MAP[servicoDesejado] || !packages || packages.length === 0) {
        return res.status(400).json({ message: 'Dados incompletos: CEP, Serviço ou Pacotes são obrigatórios.' });
    }

    try {
        // Verificar Cache MongoDB
        const cachedSimulation = await Simulation.findOne({ 
            cep: cepDestino, 
            'results.service': servicoDesejado 
        }).sort({ date: -1 });

        if (cachedSimulation) {
            const cachedResult = cachedSimulation.results.find(r => r.service === servicoDesejado);
            if (cachedResult) {
                console.log(`[CACHE] Frete recuperado para ${servicoDesejado} no CEP ${cepDestino}.`);
                return res.status(200).json({ 
                    valor: cachedResult.price.toString(),
                    delivery: cachedResult.delivery
                });
            }
        }

        // Preparar Payload para o Melhor Envio
        const payload = { 
            from: { postal_code: process.env.ORIGIN_CEP || '60191335' }, 
            to: { postal_code: cepDestino }, 
            packages: packages.map(p => ({
                weight: p.weight || 1,
                width: p.width || 10,
                height: p.height || 10,
                length: p.length || 10
            })), 
            options: { receipt: false, own_hand: false }, 
            services: SERVICES_TO_FETCH,
        };
        
        console.log(`[API] Solicitando cotação ao Melhor Envio para CEP ${cepDestino}...`);

        const response = await axios.post(ME_API_URL, payload, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`, 
                'User-Agent': 'Camiseteria Oliveira (kaionilofreitas@gmail.com)' 
            }
        });

        const resultadosME = response.data;

        // Tratar erros API
        if (!Array.isArray(resultadosME) || resultadosME.length === 0) {
            console.log(`[ERRO API] Resposta vazia ou erro no formato.`);
            return res.status(400).json({ message: "Serviço de frete indisponível para este CEP." });
        }

        // Formatar e filtrar resultados válidos
        const resultsToCache = resultadosME
            .filter(item => item.name && item.price && !item.error)
            .map(item => ({
                service: item.name.toUpperCase(), 
                price: Decimal128.fromString(String(item.price).replace(',', '.')), 
                delivery: item.delivery_range ? `${item.delivery_range.max} dias` : 
                          (item.delivery_time ? `${item.delivery_time} dias` : 'Prazo sob consulta')
            }));

        const freteEncontrado = resultsToCache.find(item => 
            item.service.includes(servicoDesejado)
        );

        if (!freteEncontrado) {
            return res.status(404).json({ message: `O serviço ${servicoDesejado} não está disponível para o CEP informado.` });
        }

        // Salvar nova simulação
        const newSimulation = new Simulation({
            cep: cepDestino,
            results: resultsToCache,
        });
        await newSimulation.save();

        // Resposta final ao front
        res.status(200).json({ 
            valor: freteEncontrado.price.toString(),
            delivery: freteEncontrado.delivery 
        });

    } catch (error) {
        console.error("================ ERROR LOG ================");
        console.error("Status:", error.response?.status);
        console.error("Data:", JSON.stringify(error.response?.data));
        console.error("===========================================");
        
        const msg = error.response?.data?.message || error.response?.data?.error || 'Erro ao processar frete.';
        res.status(error.response?.status || 500).json({ message: msg });
    }
};