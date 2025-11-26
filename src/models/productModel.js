import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "O nome do produto é obrigatório"],
  },
  price: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, "O preço é obrigatório"],
    min: [0, "O preço não pode ser negativo"],
  },
  size: {
    type: [String],
    enum: ["PP", "P", "M", "G", "GG"],
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Product", productSchema);
