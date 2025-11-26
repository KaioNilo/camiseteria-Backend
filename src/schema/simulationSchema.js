import mongoose from "mongoose";

const DeliveryResult = new mongoose.Schema({
  service: {
    type: String,
    required: [true, 'O nome do serviço de frete é obrigatório'],
    enum: ['PAC', 'SEDEX']
  },
  price: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'O valor do frete é obrigatório'],
    min: [0, 'O valor do frete não pode ser negativo']
  },
  delivery: {
    type: String,
    required: [true, 'O prazo de entrega é obrigatório'],
    trim: true
  }
}, { _id: false });

export const deliverySimulationSchema = new mongoose.Schema({
  cep: {
    type: String,
    required: [true, 'O CEP é obrigatório para a simulação de frete'],
    trim: true,
    match: [/^\d{5}-?\d{3}$/, 'CEP inválido. Use o formato XXXXX-XXX ou XXXXXXXX.']
  },
  results: {
    type: [DeliveryResult],
    required: [true, 'Os resultados da simulação de frete são obrigatórios'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'A simulação deve conter pelo menos um resultado de frete.'
    }
  },
  date: {
    type: Date,
    default: Date.now,
    expires: '1d'
  }
});

deliverySimulationSchema.index({ cep: 1, date: -1 });

export const Simulation = mongoose.model('Simulation', deliverySimulationSchema);