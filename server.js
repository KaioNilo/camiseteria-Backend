import "dotenv/config"; 
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import SimulationRoutes from "./src/routes/SimulationRoutes.js";
import ProductRoutes from "./src/routes/ProductRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// --- CONF CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://oliveiracamiseteria.vercel.app',
  'https://camiseteria-frontend.vercel.app', 
  'https://camiseteria-frontend-git-main-kaio-nilos-projects.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin
    if (!origin) return callback(null, true);
    
    // Verifica se a URL está na lista ou se está em ambiente de desenvolvimento
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    } else {
      return callback(new Error('Acesso negado pelo CORS: Este domínio não tem permissão.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json()); 

// --- ROTAS ---
app.get('/', (req, res) => {
    res.status(200).send('✅ API Oliveira Camiseteria: Online e Operante.');
});

app.use("/api/produtos", ProductRoutes);
app.use("/api/frete", SimulationRoutes);

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});

export default app;