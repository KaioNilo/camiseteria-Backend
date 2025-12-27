import express from "express";
import { simulateFreight } from "../controllers/SimulationController.js";

const router = express.Router();
router.post("/", simulateFreight); 

export default router;