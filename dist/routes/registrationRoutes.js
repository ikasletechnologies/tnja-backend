import { Router } from "express";
import { registerStudent, registerCoach, registerClub, registerMember } from "../controllers/registrationController.js";
import { updateApplicationStatus, getApplicationDetails, getPendingApplications, getDashboardStats, getLocationAnalytics, createPaymentOrder, verifyPayment, getGlobalSettings, updateGlobalSettings, promoteMember } from "../controllers/adminController.js";
import { getAllUsers, updateUserCredentials, updateUserProfile, getPublicCoaches, getPublicMembers } from "../controllers/userManagementController.js";
import { getClubs } from "../controllers/clubController.js";
import { getDistricts, getTaluksByDistrict, getTalukDetails } from "../controllers/locationController.js";
import { authenticateJWT, authorizeAdmin, authorize } from "../middleware/authMiddleware.js";
import { createEvent, getActiveEvents, getAdminEvents, applyForEvent, createEventPaymentOrder, verifyEventPayment } from "../controllers/eventController.js";
import { createTournament, getClubTournaments, getTournamentRegistrations, updateRegistrationStatus, updateTournament, deleteTournament, getPlayerTournaments, createTournamentPaymentOrder, verifyTournamentPayment, getAdminTournaments, approveTournament, getApprovedTournaments } from "../controllers/tournamentController.js";
const router = Router();
router.post("/events/create", authenticateJWT, createEvent);
router.post("/events/apply", authenticateJWT, applyForEvent);
router.get("/events/active", authenticateJWT, getActiveEvents);
router.get("/events/admin", authenticateJWT, authorizeAdmin, getAdminEvents);
router.post("/events/create-payment-order", authenticateJWT, createEventPaymentOrder);
router.post("/events/verify-payment", authenticateJWT, verifyEventPayment);
// ── Tournament Routes ──────────────────────────────────────────────────────
// Club
router.post("/tournaments/club/create", authenticateJWT, createTournament);
router.get("/tournaments/club", authenticateJWT, getClubTournaments);
// Official
router.post("/tournaments/official/create", authenticateJWT, authorize(["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"]), createTournament);
router.get("/tournaments/official/my", authenticateJWT, authorize(["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"]), getClubTournaments); // Reusing getClubTournaments since we can modify it
router.get("/tournaments/approved", authenticateJWT, getApprovedTournaments);
router.get("/tournaments/:id/registrations", authenticateJWT, getTournamentRegistrations);
router.patch("/tournaments/:id/registrations/:regId", authenticateJWT, updateRegistrationStatus);
router.put("/tournaments/:id", authenticateJWT, updateTournament);
router.delete("/tournaments/:id", authenticateJWT, deleteTournament);
// Player
router.get("/tournaments/player", authenticateJWT, getPlayerTournaments);
router.post("/tournaments/create-payment-order", authenticateJWT, createTournamentPaymentOrder);
router.post("/tournaments/verify-payment", authenticateJWT, verifyTournamentPayment);
// --- Admin Tournaments ---
router.get("/tournaments/admin", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"]), getAdminTournaments);
router.patch("/tournaments/:id/approve", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"]), approveTournament);
router.get("/districts", getDistricts);
router.get("/districts/:districtId/taluks", getTaluksByDistrict);
router.get("/taluks/:id", getTalukDetails);
router.get("/clubs", getClubs);
router.get("/coaches", getPublicCoaches);
router.get("/members", getPublicMembers);
router.post("/register/student", registerStudent);
router.post("/register/coach", registerCoach);
router.post("/register/club", registerClub);
router.post("/register/member", registerMember);
// Admin / Super-admin routes
const ALL_ADMIN_ROLES = ["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"];
router.get("/applications/pending", authenticateJWT, authorize(ALL_ADMIN_ROLES), getPendingApplications); // ?type=STUDENT|COACH|MEMBER|CLUB
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
router.patch("/users/profile", authenticateJWT, authorize(["SUPER_ADMIN", "CEO"]), updateUserProfile);
router.patch("/member/promote", authenticateJWT, authorizeAdmin, promoteMember);
export default router;
//# sourceMappingURL=registrationRoutes.js.map