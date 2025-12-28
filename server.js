import "dotenv/config"; 
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import SimulationRoutes from "./src/routes/SimulationRoutes.js";
import ProductRoutes from "./src/routes/ProductRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// --- CONFIGURAÇÃO DE CORS DINÂMICA ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://oliveiracamiseteria.vercel.app',
  'https://camiseteria-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;
    const isVercel = origin.endsWith('.vercel.app');

    if (isAllowed || isVercel || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log("Domínio bloqueado pelo CORS:", origin);
      callback(new Error('Acesso negado pelo CORS: Este domínio não tem permissão.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json()); 

// --- ROTAS ---
app.get('/api/frete/ping', (req, res) => res.json({ status: "online", message: "Rota encontrada!" }));

app.use("/api/produtos", ProductRoutes);
app.use("/api/frete", SimulationRoutes);

app.get('/', (req, res) => {
    res.status(200).send('✅ API Oliveira Camiseteria: Online');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});