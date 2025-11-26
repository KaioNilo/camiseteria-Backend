// src/routes/simulationRoutes.js
import express from "express";
import { simulateFreight } from "../controllers/SimulationController.js";

const router = express.Router();

// Rota para simulação de frete
router.post("/", simulateFreight);

export default router;
