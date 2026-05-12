import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET || "fallback", (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Forbidden: Invalid token" });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Unauthorized: No token provided" });
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === "SUPER_ADMIN" || req.user.role === "DISTRICT_ADMIN")) {
    next();
  } else {
    res.status(403).json({ error: "Forbidden: Admin access required" });
  }
};
