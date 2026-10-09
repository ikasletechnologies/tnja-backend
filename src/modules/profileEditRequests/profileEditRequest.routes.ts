import { Router } from "express";
import { authenticateJWT } from "../../middleware/authMiddleware.js";
import {
  createProfileEditRequest,
  getCoachProfileEditRequests,
  getMyProfileEditRequest,
  reviewProfileEditRequest,
} from "./profileEditRequest.controller.js";

const router = Router();

router.post("/profile-edit-requests", authenticateJWT, createProfileEditRequest);
router.get("/profile-edit-requests/my", authenticateJWT, getMyProfileEditRequest);
router.get("/profile-edit-requests/coach", authenticateJWT, getCoachProfileEditRequests);
router.put("/profile-edit-requests/:id/:action", authenticateJWT, reviewProfileEditRequest);

export default router;