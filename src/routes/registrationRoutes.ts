import { Router } from "express";
import { registerStudent, registerCoach, registerClub, registerMember } from "../controllers/registrationController.js";
import { updateApplicationStatus, getApplicationDetails, getPendingApplications, getDashboardStats } from "../controllers/adminController.js";
import { getAllUsers, updateUserCredentials } from "../controllers/userManagementController.js";
import { getClubs } from "../controllers/clubController.js";
import { getDistricts, getTaluksByDistrict, getTalukDetails } from "../controllers/locationController.js";
import { authenticateJWT, authorizeAdmin } from "../middleware/authMiddleware.js";

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
router.get("/applications/pending", authenticateJWT, authorizeAdmin, getPendingApplications);   // ?type=STUDENT|COACH|MEMBER|CLUB
router.patch("/application/status", authenticateJWT, authorizeAdmin, updateApplicationStatus);
router.get("/application/:tempId", authenticateJWT, authorizeAdmin, getApplicationDetails);
router.get("/admin/stats", authenticateJWT, authorizeAdmin, getDashboardStats);

// User Management (Super Admin)
router.get("/users/all", authenticateJWT, authorizeAdmin, getAllUsers);
router.patch("/users/credentials", authenticateJWT, authorizeAdmin, updateUserCredentials);

export default router;
