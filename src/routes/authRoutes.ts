import { Router } from "express";
import { login, getProfile } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.get("/profile", authenticateJWT, getProfile);

export default router;
