import "dotenv/config"; 
import express from "express";
import connectDB from "./src/config/db.js";
import cors from "cors";
import SimulationRoutes from "./src/routes/SimulationRoutes.js";
import ProductRoutes from "./src/routes/ProductRoutes.js";


/// Inicializando o Express
const app = express();


/// Porta configurável via .env
const PORT = process.env.PORT || 5000;


/// Conexão MongoDB
connectDB();


/// Middlewares globais
app.use(express.json()); 
app.use(cors());

// ===================================================
// 💡 AQUI É ONDE VOCÊ DEVE INSERIR A ROTA DE TESTE:
// ===================================================
app.get('/', (req, res) => {
    res.status(200).send('API de Frete Online e Funcionando! Use POST /api/frete para cotar.');
});
// ===================================================


// Rotas de Módulos
app.use("/api/produtos", ProductRoutes);
app.use("/api/frete", SimulationRoutes);

/// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

/// Exportando o servidor
export default app;