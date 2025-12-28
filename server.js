import "dotenv/config"; 
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import SimulationRoutes from "./src/routes/SimulationRoutes.js";
import ProductRoutes from "./src/routes/ProductRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();


app.use(cors({
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json()); 

// --- ROTAS ---
app.get('/api/frete/ping', (req, res) => res.json({ 
    status: "online", 
    message: "O servidor está lendo o arquivo server.js da raiz!" 
}));

app.use("/api/produtos", ProductRoutes);
app.use("/api/frete", SimulationRoutes);

app.get('/', (req, res) => {
    res.status(200).send('✅ API Oliveira Camiseteria: Online');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});