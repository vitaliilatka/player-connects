import jwt from "jsonwebtoken";

// Middleware to protect routes and optionally check user role
export function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization;

    // No token provided
    if (!header) return res.status(401).json({ message: "No token provided" });

    const token = header.split(" ")[1];

    try {
      // Verify token and attach decoded data to request
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // If a specific role is required → check permissions
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      // Invalid or expired token
      res.status(401).json({ message: "Invalid token" });
    }
  };
}
