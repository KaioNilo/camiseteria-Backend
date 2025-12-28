import Simulation from '../models/simulationModel.js';
import axios from 'axios'; 
import mongoose from 'mongoose';

const { Decimal128 } = mongoose.Types; 

const ME_API_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate'; 

const SERVICE_MAP = {
    PAC: "1",
    SEDEX: "2",
};

export const simulateFreight = async (req, res) => {
    // Log inicial para confirmar que o pedido chegou ao Controller
    console.log("➡️ [LOG] Iniciando simulateFreight no Controller...");

    try {
        const { to, packages, selected_service } = req.body; 
        
        // Limpeza e validação dos dados de entrada
        const cepDestino = to?.postal_code?.replace(/(\D)/g, '') || ''; 
        const servicoDesejado = selected_service?.toUpperCase() || '';

        console.log(`📦 [LOG] Destino: ${cepDestino} | Serviço: ${servicoDesejado}`);

        if (!cepDestino || !servicoDesejado || !SERVICE_MAP[servicoDesejado] || !packages || packages.length === 0) {
            console.log("⚠️ [LOG] Validação falhou: Dados insuficientes.");
            return res.status(400).json({ 
                message: 'Dados insuficientes para cálculo: verifique CEP, serviço e itens.' 
            });
        }

        // Verificar Cache
        const cachedSimulation = await Simulation.findOne({ 
            cep: cepDestino, 
            'results.service': servicoDesejado 
        }).sort({ date: -1 });

        if (cachedSimulation) {
            console.log("💾 [LOG] Resultado encontrado no Banco de Dados (Cache).");
            const cachedResult = cachedSimulation.results.find(r => r.service.includes(servicoDesejado));
            if (cachedResult) {
                return res.status(200).json({ 
                    valor: cachedResult.price.toString(),
                    delivery: cachedResult.delivery 
                });
            }
        }

        // Chamar API Melhor Envio
        console.log("🌐 [LOG] Chamando API do Melhor Envio...");
        const response = await axios.post(ME_API_URL, {
            from: { postal_code: "60191335" }, 
            to: { postal_code: cepDestino },
            products: packages.map((p, index) => ({
                id: `p-${index}`,
                width: p.width,
                height: p.height,
                length: p.length,
                weight: p.weight,
                insurance_value: p.insurance || 100,
                quantity: 1
            }))
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
                'User-Agent': 'Oliveira Camiseteria (kaionilofreitas@gmail.com)' 
            }
        });

        const resultadosME = response.data;

        if (!Array.isArray(resultadosME) || resultadosME.length === 0) {
            console.log("❌ [LOG] Melhor Envio não retornou serviços válidos.");
            return res.status(400).json({ message: "Nenhum serviço disponível para este CEP." });
        }

        // Processar e filtrar resultados
        const resultsToSave = resultadosME
            .filter(item => item.name && item.price && !item.error)
            .map(item => ({
                service: item.name.toUpperCase(), 
                price: Decimal128.fromString(String(item.price).replace(',', '.')), 
                delivery: item.delivery_range ? `${item.delivery_range.max} dias` : 'Prazo sob consulta'
            }));

        const freteEncontrado = resultsToSave.find(item => 
            item.service.includes(servicoDesejado)
        );

        if (!freteEncontrado) {
            console.log(`⚠️ [LOG] Serviço ${servicoDesejado} não encontrado na resposta da API.`);
            return res.status(404).json({ message: `Serviço ${servicoDesejado} indisponível para esta região.` });
        }

        // alvar no BD
        const newSimulation = new Simulation({
            cep: cepDestino,
            results: resultsToSave,
        });
        await newSimulation.save();

        console.log("✅ [LOG] Frete calculado e salvo com sucesso!");

        return res.status(200).json({ 
            valor: freteEncontrado.price.toString(),
            delivery: freteEncontrado.delivery 
        });

    } catch (error) {
        console.error("🔥 [ERRO] Falha no Controller:", error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            return res.status(500).json({ message: "Erro de autenticação com o fornecedor de frete." });
        }

        return res.status(500).json({ 
            message: "Erro interno ao calcular frete.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
};