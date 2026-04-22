import jwt from "jsonwebtoken";
import { BaseAuth } from "../modules/auth/baseAuth.model.js";
import { AppError } from "../util/common/AppError.js";
import { asyncHandler } from "../util/common/asyncHandler.js";

export const authenticate = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      let token;
      // console.log(token, "token===")
      // 1️⃣ Check Authorization Header
      const authHeader = req.headers.authorization;

      if (authHeader) {
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        } else {
          token = authHeader; // raw token
        }
      }
      // console.log(authHeader, "authHeader")
      // 2️⃣ If not in header, check cookies
      if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token;
      }

      if (!token) {
        return next(new AppError("Access token missing", 401));
      }
      // console.log(token, "/////")
      // 3️⃣ Verify
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      // console.log(decoded, "decoded")
      const user = await BaseAuth.findById(decoded.id);
      // console.log(user, "user")
      if (!user) {
        return next(new AppError("User not found", 401));
      }

      // 4️⃣ Role check
      if (allowedRoles.length) {
        const userRole = (user.role || "").toLowerCase();
        const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

        // console.log(`[Auth] Path: ${req.path}, User: ${user._id}, Allowed: [${allowedRoles}], Actual: ${user.role}`);

        if (!isAllowed) {
          return next(new AppError("Forbidden: Insufficient permissions", 403));
        }
      }

      req.user = user;
      req.token = token;

      next();

    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      if (error.name === "TokenExpiredError") {
        return next(new AppError("Access token expired", 401));
      }

      if (error.name === "JsonWebTokenError") {
        return next(new AppError("Invalid token", 401));
      }

      return next(new AppError("Authentication failed", 401));
    }
  };
};


export const refreshAccessToken = asyncHandler(async (req, res) => {

  let refreshToken;

  // 1️⃣ x-refresh-token header
  if (req.headers["x-refresh-token"]) {
    refreshToken = req.headers["x-refresh-token"];
  }

  // 2️⃣ Authorization header
  if (!refreshToken && req.headers.authorization) {
    const authHeader = req.headers.authorization;

    if (authHeader.startsWith("Bearer ")) {
      refreshToken = authHeader.split(" ")[1];
    } else {
      refreshToken = authHeader;
    }
  }

  // 3️⃣ Cookie
  if (!refreshToken && req.cookies?.refresh_token) {
    refreshToken = req.cookies.refresh_token;
  }

  if (!refreshToken) {
    throw new AppError("Refresh token missing", 403);
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await BaseAuth.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      throw new AppError("Invalid refresh token", 403);
    }

    // 🔥 Rotate tokens
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshTokens = user.refreshTokens.filter(
      (token) => token !== refreshToken
    );

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    throw new AppError("Refresh token expired or invalid", 401);
  }
});
