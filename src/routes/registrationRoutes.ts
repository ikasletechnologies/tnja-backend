import { Router } from "express";
import { registerStudent, registerCoach, registerClub, registerMember, resubmitApplication } from "../controllers/registrationController.js";
import { updateApplicationStatus, requestChanges, getApplicationDetails, getPendingApplications, getDashboardStats, getLocationAnalytics, createPaymentOrder, verifyPayment, getGlobalSettings, updateGlobalSettings, promoteMember, forceCreateStudent, forceCreateClub, forceCreateMember } from "../controllers/adminController.js";
import { getAllUsers, updateUserCredentials, updateUserProfile, getPublicCoaches, getPublicMembers, getCoachStudents, deleteUser } from "../controllers/userManagementController.js";
import { getClubs } from "../controllers/clubController.js";
import { getDistricts, getTaluksByDistrict, getTalukDetails } from "../controllers/locationController.js";
import { authenticateJWT, authorizeAdmin, authorize } from "../middleware/authMiddleware.js";
import { createEvent, getActiveEvents, getAdminEvents, getMyEvents, updateEvent, applyForEvent, createEventPaymentOrder, verifyEventPayment, getEventSections } from "../controllers/eventController.js";
import { createTournament, getClubTournaments, getTournamentRegistrations, updateRegistrationStatus, sendRegistrationReply, getRegistrationMessages, updateTournament, deleteTournament, getPlayerTournaments, getPlayerPublicMatches, createTournamentPaymentOrder, verifyTournamentPayment, getAdminTournaments, getAdminApprovedTournaments, approveTournament, sendTournamentReply, getApprovedTournaments, getTournamentById, getTournamentDraws, saveTournamentDraw, getTournamentMessages, submitTournamentResults } from "../controllers/tournamentController.js";
import { downloadCertificate } from "../controllers/certificateController.js";
import scoreboardOptions from "../data/scoreboardOptions.json" with { type: "json" };

const router = Router();

router.post("/events/create", authenticateJWT, createEvent);
router.get("/events/my", authenticateJWT, getMyEvents);
router.put("/events/:id", authenticateJWT, updateEvent);
router.post("/events/apply", authenticateJWT, applyForEvent);
router.get("/events/active", authenticateJWT, getActiveEvents);
router.get("/events/admin", authenticateJWT, authorizeAdmin, getAdminEvents);
router.post("/events/create-payment-order", authenticateJWT, createEventPaymentOrder);
router.post("/events/verify-payment", authenticateJWT, verifyEventPayment);
router.get("/events/sections", authenticateJWT, getEventSections);

// ── Tournament Routes ──────────────────────────────────────────────────────
// Club
router.post("/tournaments/club/create", authenticateJWT, createTournament);
router.get("/tournaments/club", authenticateJWT, getClubTournaments);
// Official
router.post("/tournaments/official/create", authenticateJWT, authorize(["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"]), createTournament);
router.get("/tournaments/official/my", authenticateJWT, authorize(["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"]), getClubTournaments); // Reusing getClubTournaments since we can modify it

router.get("/tournaments/approved", authenticateJWT, getApprovedTournaments);
// Player
router.get("/tournaments/player", authenticateJWT, getPlayerTournaments);
router.get("/tournaments/player/matches", authenticateJWT, getPlayerPublicMatches);
router.post("/tournaments/player/pay", authenticateJWT, createTournamentPaymentOrder);
router.post("/tournaments/player/verify", authenticateJWT, verifyTournamentPayment);
router.get("/tournaments/:id/certificate", authenticateJWT, downloadCertificate);

// --- Admin Tournaments ---
router.get("/tournaments/admin", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"]), getAdminTournaments);
router.get("/tournaments/admin/approved", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"]), getAdminApprovedTournaments);

// --- Parameterized Routes (MUST BE LAST) ---
router.get("/tournaments/:id/registrations", authenticateJWT, getTournamentRegistrations);
router.patch("/tournaments/:id/registrations/:regId", authenticateJWT, updateRegistrationStatus);
router.post("/tournaments/:id/registrations/:regId/reply", authenticateJWT, sendRegistrationReply);
router.get("/tournaments/:id/registrations/:regId/messages", authenticateJWT, getRegistrationMessages);
router.get("/tournaments/:id", authenticateJWT, getTournamentById);
router.get("/tournaments/:id/draws", authenticateJWT, getTournamentDraws);
router.post("/tournaments/:id/draws", authenticateJWT, saveTournamentDraw);
router.post("/tournaments/:id/results", authenticateJWT, submitTournamentResults);
router.put("/tournaments/:id", authenticateJWT, updateTournament);
router.delete("/tournaments/:id", authenticateJWT, deleteTournament);
router.patch("/tournaments/:id/approve", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"]), approveTournament);
router.post("/tournaments/:id/reply", authenticateJWT, authorize(["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "CLUB"]), sendTournamentReply);
router.get("/tournaments/:id/messages", authenticateJWT, getTournamentMessages);

router.get("/scoreboard/options", (req, res) => {
  return res.json(scoreboardOptions);
});

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
router.post("/resubmit-application", authenticateJWT, resubmitApplication);

// Admin / Super-admin routes
const ALL_ADMIN_ROLES = ["SUPER_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"];

router.get("/applications/pending", authenticateJWT, authorize(ALL_ADMIN_ROLES), getPendingApplications);   // ?type=STUDENT|COACH|MEMBER|CLUB
router.patch("/application/status", authenticateJWT, authorize(ALL_ADMIN_ROLES), updateApplicationStatus);
router.post("/admin/request-changes", authenticateJWT, authorize(ALL_ADMIN_ROLES), requestChanges);
router.get("/application/:tempId", authenticateJWT, authorize(ALL_ADMIN_ROLES), getApplicationDetails);
router.get("/admin/stats", authenticateJWT, authorizeAdmin, getDashboardStats);
router.get("/admin/location-analytics", authenticateJWT, authorizeAdmin, getLocationAnalytics);
router.post("/application/create-order", authenticateJWT, createPaymentOrder);
router.post("/application/verify-payment", authenticateJWT, verifyPayment);

// Super Admin Direct Creation
router.post("/admin/create-student", authenticateJWT, authorize(["SUPER_ADMIN", "CEO"]), forceCreateStudent);
router.post("/admin/create-club", authenticateJWT, authorize(["SUPER_ADMIN", "CEO"]), forceCreateClub);
router.post("/admin/create-member", authenticateJWT, authorize(["SUPER_ADMIN", "CEO"]), forceCreateMember);

router.get("/settings/global", getGlobalSettings);
router.patch("/settings/global", authenticateJWT, authorizeAdmin, updateGlobalSettings);

// User Management (Super Admin)
router.get("/users/all", authenticateJWT, authorizeAdmin, getAllUsers);
router.patch("/users/credentials", authenticateJWT, authorizeAdmin, updateUserCredentials);
router.patch("/users/profile", authenticateJWT, authorize(["SUPER_ADMIN", "CEO"]), updateUserProfile);
router.delete("/users/:type/:id", authenticateJWT, authorize(["SUPER_ADMIN", "CEO"]), deleteUser);
router.patch("/member/promote", authenticateJWT, authorizeAdmin, promoteMember);

// ── Coach Dashboard ────────────────────────────────────────────────────────
router.get("/coach/students", authenticateJWT, getCoachStudents);

export default router;
