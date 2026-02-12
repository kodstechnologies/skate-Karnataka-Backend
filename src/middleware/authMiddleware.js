import jwt from "jsonwebtoken";
import { BaseAuth } from "../modules/auth/model/baseAuth.model.js";
import { JWT_ACCESS_SECRET } from "../config/envConfig.js";
import { AppError } from "../util/common/AppError.js";
import { log } from "console";

export const authenticate = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            // 1️⃣ Get Authorization header
            const authHeader = req.headers.authorization?.trim();
            // console.log("🚀 ~ authenticate ~ authHeader:", authHeader)

            if (!authHeader) {
                return next(new AppError("Unauthorized: Token missing", 401));
            }

            // 2️⃣ Extract token (Bearer OR raw)
            const token = authHeader.toLowerCase().startsWith("bearer ")
                ? authHeader.split(" ")[1]
                : authHeader;

            if (!token) {
                return next(new AppError("Unauthorized: Invalid token format", 401));
            }

            // 3️⃣ Verify JWT
            const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
            // console.log("decoded payload:", decoded, "type:", typeof decoded);

            if (!decoded?.id) {
                return next(new AppError("Invalid token: userId missing", 401));
            }

            // 4️⃣ Find user
            const user = await BaseAuth.findById(decoded.id.toString());
            // log("🚀 ~ authenticate ~ user:", user)

            if (!user) {
                return next(new AppError("Unauthorized: User not found", 401));
            }

            // 5️⃣ Role check
            if (
                allowedRoles.length &&
                !allowedRoles.includes(user.role)
            ) {
                return next(
                    new AppError("Forbidden: Insufficient permissions", 403)
                );
            }

            req.user = user;
            req.token = token;

            next();

        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return next(new AppError("Token expired", 401));
            }

            if (error.name === "JsonWebTokenError") {
                return next(new AppError("Invalid token", 401));
            }

            return next(new AppError("Authentication failed", 401));
        }
    };
};
