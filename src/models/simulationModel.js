import mongoose from "mongoose";

//Sub-schema para cada serviço de frete (PAC, SEDEX)
const deliveryResultSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: [true, "O nome do serviço de frete é obrigatório"],
      enum: ["PAC", "SEDEX"], // Garante que apenas 'PAC' ou 'SEDEX' sejam aceitos
    },
    price: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, "O valor do frete é obrigatório"],
      min: [0, "O valor do frete não pode ser negativo"],
    },
    delivery: {
      type: Number,
      required: [true, "O prazo de entrega é obrigatório"],
      min: [1, "O prazo de entrega deve ser pelo menos 1 dia"],
    },
  },
  { _id: false } // Não criar _id para cada sub-documento resultado
);

// Schema principal para as simulações de frete
const simulationSchema = new mongoose.Schema({
  cep: {
    type: String,
    required: [true, "O CEP é obrigatório para a simulação de frete"],
    trim: true,
    match: [/^\d{5}-?\d{3}$/, "CEP inválido. Use o formato XXXXX-XXX ou XXXXXXXX."],
  },
  results: {
    type: [deliveryResultSchema],
    required: [true, "Os resultados da simulação de frete são obrigatórios"],
    validate: {
      validator: function (v) {
        return v && v.length > 0; //    Array de resultados não pode ser vazio
      },
      message: "A simulação deve conter pelo menos um resultado de frete.",
    },
  },
  date: {
    type: Date,
    default: Date.now,
    expires: "1d",
  },
});

// Índice para buscas por CEP mais recente
simulationSchema.index({ cep: 1, date: -1 });

const Simulation = mongoose.model("Simulation", simulationSchema);

export default Simulation;