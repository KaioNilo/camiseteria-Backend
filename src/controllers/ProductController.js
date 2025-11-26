import Product from '../models/productModel.js'; 

//  Rota de busca todos
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        const productsJSON = products.map(p => ({
            ...p.toObject(),
            price: p.price.toString()
        }));
        res.status(200).json(productsJSON);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Rota de busca por ID
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Rota de criação
export const createProduct = async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {

        if (error.name === 'ValidationError') {
            let errors = {};
            Object.keys(error.errors).forEach((key) => {
                errors[key] = error.errors[key].message;
            });
            return res.status(400).json({ message: 'Erro de validação', errors });
        }
        res.status(500).json({ message: error.message });
    }
};

// Rota de atualização
export const updateProduct = async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true } // Retorna o documento atualizado e roda validações
        );
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json(updatedProduct);
    } catch (error) {
        if (error.name === 'ValidationError') {
            let errors = {};
            Object.keys(error.errors).forEach((key) => {
                errors[key] = error.errors[key].message;
            });
            return res.status(400).json({ message: 'Erro de validação', errors });
        }
        res.status(500).json({ message: error.message });
    }
};

// Rota de exclusão
export const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json({ message: 'Produto removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};