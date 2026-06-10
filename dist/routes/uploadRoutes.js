import { Router } from "express";
import { upload } from "../middleware/uploadMiddleware.js";
const router = Router();
router.post("/upload", (req, res) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || "File upload failed" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file was uploaded." });
        }
        // Generate public URL
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        return res.status(200).json({
            message: "File uploaded successfully.",
            filename: req.file.filename,
            url: fileUrl,
        });
    });
});
export default router;
//# sourceMappingURL=uploadRoutes.js.map