import { Router } from "express";
import { login, getProfile, changePassword, forgotPassword, resetPassword, trackStatus } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.get("/profile", authenticateJWT, getProfile);
router.post("/change-password", authenticateJWT, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/track-status/:id", trackStatus);

export default router;
