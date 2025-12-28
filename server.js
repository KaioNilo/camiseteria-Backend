import "dotenv/config"; 
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import SimulationRoutes from "./src/routes/SimulationRoutes.js";
import ProductRoutes from "./src/routes/ProductRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// CORS
app.use(cors({
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json()); 

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Definição das Rotas
app.use("/api/frete", SimulationRoutes);
app.use("/api/produtos", ProductRoutes);

app.get('/api/frete/ping', (req, res) => {
    res.json({ 
        status: "online", 
        message: "Servidor lendo a raiz corretamente!",
        timestamp: new Date()
    });
});

app.get('/', (req, res) => {
    res.status(200).send('✅ API Oliveira Camiseteria: Online');
});

// Inicialização do Servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});