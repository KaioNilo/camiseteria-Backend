import Simulation from '../models/simulationModel.js';
import axios from 'axios'; 
import mongoose from 'mongoose';

const { Decimal128 } = mongoose.Types; 
const ME_API_URL = 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

// Simular frete
export const simulateFreight = async (req, res) => {
    // Dados do front
    const { from, to, package: pacote, selected_service } = req.body; 

    const cepDestino = to.postal_code.replace(/(\D)/g, ''); // Limpa CEP
    const servicoDesejado = selected_service.toUpperCase(); // "PAC" ou "SEDEX"

    if (!cepDestino || !servicoDesejado) {
        return res.status(400).json({ message: 'CEP ou Serviços de envio incompletos.' });
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
                return res.status(200).json({ 
                    valor: cachedResult.price.toString(),
                    delivery: cachedResult.delivery
                });
            }
        }

        // Chamada API Melhor Envio
        const payload = { from, to, package: pacote };
        
        const response = await axios.post(ME_API_URL, payload, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`, 
            }
        });

        const resultadosME = response.data;

        // Tratar erros API
        if (resultadosME.length === 0 || resultadosME.error || resultadosME[0]?.error) {
            const mensagemErro = resultadosME[0]?.error || resultadosME.error || "Serviço de frete não cotado para este CEP.";
            return res.status(400).json({ message: mensagemErro });
        }
        
        // Formatar resultados e salvar no cache
        const resultsToCache = resultadosME.map(item => ({
      
            service: item.name.toUpperCase(),
            price: Decimal128.fromString(item.price.replace(',', '.')), 
            delivery: item.delivery.min ? `${item.delivery.min} dias` : 'Não informado'
        }));

        const freteEncontrado = resultsToCache.find(item => 
            item.service.includes(servicoDesejado)
        );

        if (!freteEncontrado) {
            return res.status(404).json({ message: `O serviço ${servicoDesejado} não está disponível.` });
        }

        // Salvar resultados DB
        const newSimulation = new Simulation({
            cep: cepDestino,
            results: resultsToCache,
        });
        await newSimulation.save();

        // Retornar valor 
        res.status(200).json({ 
            valor: freteEncontrado.price.toString(),
            delivery: freteEncontrado.delivery 
        });

    } catch (error) {
        console.error(`Erro ao simular frete:`, error.message);

        // Trata erros de conexão e mensagem amigável
        const msg = error.response?.data?.error || 'Erro interno do servidor ao simular frete.';
        res.status(500).json({ message: msg });
    }
};