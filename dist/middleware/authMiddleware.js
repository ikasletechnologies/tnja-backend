import jwt from "jsonwebtoken";
export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: Token missing from header" });
        }
        jwt.verify(token, process.env.JWT_SECRET || "fallback", (err, user) => {
            if (err) {
                return res.status(403).json({ error: "Forbidden: Invalid token" });
            }
            req.user = user;
            next();
        });
    }
    else {
        res.status(401).json({ error: "Unauthorized: No token provided" });
    }
};
export const authorizeAdmin = (req, res, next) => {
    const adminRoles = [
        "SUPER_ADMIN",
        "DISTRICT_PRESIDENT",
        "DISTRICT_SECRETARY",
        "ZONE_PRESIDENT",
        "ZONE_SECRETARY",
        "STATE_PRESIDENT",
        "STATE_SECRETARY"
    ];
    if (req.user && adminRoles.includes(req.user.role)) {
        next();
    }
    else {
        res.status(403).json({ error: "Forbidden: Admin access required" });
    }
};
export const authorize = (roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            next();
        }
        else {
            res.status(403).json({ error: "Forbidden: You do not have permission to access this resource" });
        }
    };
};
//# sourceMappingURL=authMiddleware.js.map