import { Router } from "express";
import { login, getProfile, updateProfile, changePassword, forgotPassword, resetPassword, trackStatus, sendAadhaarOtp, verifyAadhaarOtp } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";
const router = Router();
router.post("/login", login);
router.get("/profile", authenticateJWT, getProfile);
router.put("/profile", authenticateJWT, updateProfile);
router.post("/change-password", authenticateJWT, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/track-status/:id", trackStatus);
router.post("/send-aadhaar-otp", sendAadhaarOtp);
router.post("/verify-aadhaar-otp", verifyAadhaarOtp);
export default router;
//# sourceMappingURL=authRoutes.js.map