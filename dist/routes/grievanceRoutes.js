import { Router } from "express";
import { createGrievance, getMyGrievances, getAllGrievances, replyToGrievance } from "../controllers/grievanceController.js";
const router = Router();
router.post("/grievances", createGrievance);
router.get("/grievances/user/:userId", getMyGrievances);
router.get("/grievances", getAllGrievances);
router.put("/grievances/:id/reply", replyToGrievance);
export default router;
//# sourceMappingURL=grievanceRoutes.js.map