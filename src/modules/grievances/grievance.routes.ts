import { Router } from "express";
import { 
  createGrievance, 
  getMyGrievances, 
  getAllGrievances, 
  replyToGrievance,
  closeGrievance
} from "./grievance.controller";

import { upload } from "../../middleware/uploadMiddleware";

const router = Router();

router.post("/grievances", upload.any(), createGrievance);
router.get("/grievances/user/:userId", getMyGrievances);
router.get("/grievances", getAllGrievances);
router.put("/grievances/:id/reply", replyToGrievance);
router.put("/grievances/:id/close", closeGrievance);

export default router;
