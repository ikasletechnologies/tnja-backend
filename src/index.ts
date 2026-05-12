import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import registrationRoutes from "./routes/registrationRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", registrationRoutes);
app.use("/api/auth", authRoutes);

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "TNJA Backend is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
