import Simulation from '../models/simulationModel.js';
import axios from 'axios'; 
import mongoose from 'mongoose';

const { Decimal128 } = mongoose.Types; 

const ME_API_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate'; 

const SERVICE_MAP = {
    PAC: "1",
    SEDEX: "2",
};

const SERVICES_TO_FETCH = "1,2";

export const simulateFreight = async (req, res) => {
    // Captura dados frontend
    const { to, packages, selected_service } = req.body; 
    
    // Normalização dados
    const cepDestino = to?.postal_code?.replace(/(\D)/g, '') || ''; 
    const servicoDesejado = selected_service?.toUpperCase() || '';

    // Validação antes de chamar API externa
    if (!cepDestino || !servicoDesejado || !SERVICE_MAP[servicoDesejado] || !packages || packages.length === 0) {
        return res.status(400).json({ 
            message: 'Dados insuficientes para cálculo: verifique CEP, serviço e itens no carrinho.' 
        });
    }

    try {
        // Verificação Cache
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

        // Preparação envio para Melhor Envio
        const payload = { 
            from: { postal_code: process.env.ORIGIN_CEP || '60191335' }, 
            to: { postal_code: cepDestino }, 
            packages: packages.map(p => ({
                weight: p.weight || 0.3,
                width: p.width || 11,
                height: p.height || 11,
                length: p.length || 16
            })), 
            options: { receipt: false, own_hand: false }, 
            services: SERVICES_TO_FETCH,
        };
        
        console.log(`[API] Solicitando cotação para o CEP ${cepDestino}...`);

        const response = await axios.post(ME_API_URL, payload, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`, 
                'User-Agent': 'Camiseteria Oliveira (kaionilofreitas@gmail.com)' 
            }
        });

        const resultadosME = response.data;

        // Validação resposta API externa
        if (!Array.isArray(resultadosME) || resultadosME.length === 0) {
            return res.status(400).json({ message: "Nenhum serviço de entrega disponível para este CEP." });
        }

        // Tratamento e filtragem dados
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
            return res.status(404).json({ message: `O serviço ${servicoDesejado} não atende esta região no momento.` });
        }

        // Persistência MongoDB
        const newSimulation = new Simulation({
            cep: cepDestino,
            results: resultsToCache,
        });
        await newSimulation.save();

        // Retorno frontend
        return res.status(200).json({ 
            valor: freteEncontrado.price.toString(),
            delivery: freteEncontrado.delivery 
        });

    } catch (error) {
        console.error("================ ERROR LOG ================");
        console.error("Status da Falha:", error.response?.status);
        console.error("Erro da API:", JSON.stringify(error.response?.data));
        console.error("===========================================");
        
        const msg = error.response?.data?.message || 'Erro ao calcular frete. Tente novamente em instantes.';
        return res.status(error.response?.status || 500).json({ message: msg });
    }
};