import mongoose from "mongoose";

export const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'O nome do produto é obrigatório'],
        trim: true // Remover espaços em branco
    },
    price: {
        type: mongoose.Schema.Types.Decimal128,
        required: [true, 'O preço do produto é obrigatório'],
        min: [0, 'O preço não pode ser negativo']
    },
    image: {
        type: String,
        required: [true, 'A URL da imagem é obrigatória'],
        trim: true
    },
    size: {
        type: [String],
        required: true,
        enum: ['PP', 'P', 'M', 'G', 'GG'],
        validate: { 
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'O produto deve ter pelo menos um tamanho disponível.'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Product = mongoose.model('Product', productSchema);