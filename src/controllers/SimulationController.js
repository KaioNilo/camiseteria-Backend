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
    console.log("➡️ [LOG] Iniciando simulateFreight no Controller...");

    try {
        const { to, packages, selected_service } = req.body; 
        const cepDestino = to?.postal_code?.replace(/(\D)/g, '') || ''; 
        const servicoDesejado = selected_service?.toUpperCase() || '';

        console.log(`📦 [LOG] Destino: ${cepDestino} | Serviço: ${servicoDesejado}`);

        if (!cepDestino || !servicoDesejado || !SERVICE_MAP[servicoDesejado] || !packages || packages.length === 0) {
            return res.status(400).json({ message: 'Dados insuficientes.' });
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

        // Filtramos e salvar APENAS PAC ou SEDEX
        const resultsToSave = resultadosME
            .filter(item => {
                const nome = item.name?.toUpperCase() || '';
                return (nome.includes('PAC') || nome.includes('SEDEX')) && !item.error;
            })
            .map(item => ({
                service: item.name.toUpperCase().includes('SEDEX') ? 'SEDEX' : 'PAC', 
                price: Decimal128.fromString(String(item.price).replace(',', '.')), 
                delivery: item.delivery_range ? Number(item.delivery_range.max) : 0
            }));

        // Procurar serviço específico solicitado
        const freteEncontrado = resultsToSave.find(item => item.service === servicoDesejado);

        if (!freteEncontrado) {
            console.log(`⚠️ [LOG] O serviço ${servicoDesejado} não foi retornado pelo Melhor Envio.`);
            return res.status(404).json({ message: `Serviço ${servicoDesejado} indisponível para este CEP.` });
        }

        // Salvar no Banco
        const newSimulation = new Simulation({
            cep: cepDestino,
            results: resultsToSave,
        });
        await newSimulation.save();

        console.log("✅ [LOG] Frete calculado e salvo com sucesso!");

        return res.status(200).json({ 
            valor: freteEncontrado.price.toString(),
            delivery: `${freteEncontrado.delivery} dias` 
        });

    } catch (error) {
        console.error("🔥 [ERRO] Falha no Controller:", error.message);
        return res.status(500).json({ message: "Erro interno no servidor ao processar frete." });
    }
};