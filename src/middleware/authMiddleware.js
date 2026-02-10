import jwt from "jsonwebtoken";
import { AppError } from "../utils/common/AppError.js";
import { BaseAuth } from "../modules/auth/model/baseAuth.model.js";
import {
    JWT_ACCESS_SECRET
} from "../config/envConfig.js";

// ---------------------------------------
// 🔐 AUTH MIDDLEWARE (ROLE BASED)
// ---------------------------------------
export const authenticate = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            // 1️⃣ Get token from Header OR Cookie
            let token = null;

            if (req.headers.authorization?.startsWith("Bearer ")) {
                token = req.headers.authorization.split(" ")[1];
            } else if (req.cookies?.auth_token) {
                token = req.cookies.auth_token;
            }

            if (!token) {
                return next(new AppError("Unauthorized: Token missing", 401));
            }

            // 2️⃣ Verify token
            const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

            // 3️⃣ Get user
            const user = await BaseAuth.findById(decoded.id).select("-password");

            if (!user) {
                return next(new AppError("Unauthorized: User not found", 401));
            }

            // 4️⃣ Role-based authorization
            if (
                allowedRoles.length &&
                !allowedRoles.includes(decoded.role)
            ) {
                return next(
                    new AppError("Forbidden: Insufficient permissions", 403)
                );
            }

            // 5️⃣ Attach user to request
            req.user = user;
            next();
        } catch (error) {
            return next(
                new AppError(
                    error.name === "TokenExpiredError"
                        ? "Token expired"
                        : "Invalid token",
                    401
                )
            );
        }
    };
};
