import { Router } from "express";
import { registerStudent, registerCoach, registerClub, registerMember } from "../controllers/registrationController.js";
import { updateApplicationStatus, getApplicationDetails, getPendingApplications, getDashboardStats, getLocationAnalytics, createPaymentOrder, verifyPayment, getGlobalSettings, updateGlobalSettings, promoteMember } from "../controllers/adminController.js";
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
const ALL_ADMIN_ROLES = ["SUPER_ADMIN", "DISTRICT_ADMIN", "MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY"];

router.get("/applications/pending", authenticateJWT, authorize(ALL_ADMIN_ROLES), getPendingApplications);   // ?type=STUDENT|COACH|MEMBER|CLUB
router.patch("/application/status", authenticateJWT, authorize(ALL_ADMIN_ROLES), updateApplicationStatus);
router.get("/application/:tempId", authenticateJWT, authorize(ALL_ADMIN_ROLES), getApplicationDetails);
router.get("/admin/stats", authenticateJWT, authorizeAdmin, getDashboardStats);
router.get("/admin/location-analytics", authenticateJWT, authorizeAdmin, getLocationAnalytics);
router.post("/application/create-order", authenticateJWT, createPaymentOrder);
router.post("/application/verify-payment", authenticateJWT, verifyPayment);

router.get("/settings/global", getGlobalSettings);
router.patch("/settings/global", authenticateJWT, authorizeAdmin, updateGlobalSettings);

// User Management (Super Admin)
router.get("/users/all", authenticateJWT, authorizeAdmin, getAllUsers);
router.patch("/users/credentials", authenticateJWT, authorizeAdmin, updateUserCredentials);
router.patch("/member/promote", authenticateJWT, authorizeAdmin, promoteMember);

export default router;
