import { Router } from "express";
import { registerStudent, registerCoach, registerClub, registerMember } from "../controllers/registrationController.js";
import { updateApplicationStatus, getApplicationDetails, getPendingApplications, getDashboardStats, createPaymentOrder, verifyPayment, getGlobalSettings, updateGlobalSettings } from "../controllers/adminController.js";
import { getAllUsers, updateUserCredentials } from "../controllers/userManagementController.js";
import { getClubs } from "../controllers/clubController.js";
import { getDistricts, getTaluksByDistrict, getTalukDetails } from "../controllers/locationController.js";
import { authenticateJWT, authorizeAdmin, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/districts", getDistricts);
router.get("/districts/:districtId/taluks", getTaluksByDistrict);
router.get("/taluks/:id", getTalukDetails);
router.get("/clubs", getClubs);
router.post("/register/student", registerStudent);
router.post("/register/coach", registerCoach);
router.post("/register/club", registerClub);
router.post("/register/member", registerMember);

// Admin / Super-admin routes
router.get("/applications/pending", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_ADMIN", "MEMBER"]), getPendingApplications);   // ?type=STUDENT|COACH|MEMBER|CLUB
router.patch("/application/status", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_ADMIN", "MEMBER"]), updateApplicationStatus);
router.get("/application/:tempId", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_ADMIN", "MEMBER"]), getApplicationDetails);
router.get("/admin/stats", authenticateJWT, authorizeAdmin, getDashboardStats);
router.post("/application/create-order", authenticateJWT, createPaymentOrder);
router.post("/application/verify-payment", authenticateJWT, verifyPayment);

router.get("/settings/global", getGlobalSettings);
router.patch("/settings/global", authenticateJWT, authorizeAdmin, updateGlobalSettings);

// User Management (Super Admin)
router.get("/users/all", authenticateJWT, authorizeAdmin, getAllUsers);
router.patch("/users/credentials", authenticateJWT, authorizeAdmin, updateUserCredentials);

export default router;
