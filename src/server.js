import "dotenv/config"; 
import express from "express";
import connectDB from "./config/db.js";
import cors from "cors";
import SimulationRoutes from "./routes/SimulationRoutes.js";
import ProductRoutes from "./routes/ProductRoutes.js";


/// Inicializando o Express
const app = express();


/// Porta configurável via .env
const PORT = process.env.PORT || 5000;


/// Conexão MongoDB
connectDB();


/// Middlewares globais
app.use(express.json()); 
app.use(cors());


// Rotas de Módulos
app.use("/api/produtos", ProductRoutes);
app.use("/api/frete", SimulationRoutes);

/// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

/// Exportando o servidor
export default app;
