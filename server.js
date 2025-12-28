import "dotenv/config"; 
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import SimulationRoutes from "./src/routes/SimulationRoutes.js";
import ProductRoutes from "./src/routes/ProductRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.set('strict routing', false);

connectDB();

app.use(cors({
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json()); 

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] 📡 Chamada: ${req.method} ${req.url}`);
    next();
});

// --- ROTAS ---
app.use("/api/frete", SimulationRoutes);
app.use("/api/produtos", ProductRoutes);

app.get('/api/frete/ping', (req, res) => res.json({ 
    status: "online", 
    message: "Servidor a ler a raiz com sucesso!" 
}));

app.get('/', (req, res) => res.status(200).send('✅ API Oliveira Camiseteria: Online'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});