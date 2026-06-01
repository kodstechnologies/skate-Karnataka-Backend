import jwt from "jsonwebtoken";
import { BaseAuth } from "../modules/auth/baseAuth.model.js";
import { AppError } from "../util/common/AppError.js";
import { asyncHandler } from "../util/common/asyncHandler.js";

const BLOCKED_ACCOUNT_MESSAGE =
  "Your account has been blocked by the KRSA administrator. Please contact support if you believe this is a mistake.";

/** Applies to every BaseAuth role (Skater, Club, District, Parent, etc.). */
const rejectIfUserBlocked = (user) => {
  if (user?.isBlocked === true) {
    return new AppError(BLOCKED_ACCOUNT_MESSAGE, 401);
  }
  return null;
};

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
      const decodedUserId = decoded?.id || decoded?._id || decoded?.userId;
      const user = decodedUserId ? await BaseAuth.findById(decodedUserId) : null;
      // console.log(user, "user")
      if (!user) {
        return next(new AppError("User not found", 401));
      }

      const blockedError = rejectIfUserBlocked(user);
      if (blockedError) {
        return next(blockedError);
      }

      // Role check (blocked users are already rejected above for all roles)
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

/** 24-char hex MongoDB ObjectId string */
const looksLikeMongoObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

/**
 * After authenticate(["Admin", "State", "Club"]), allow Admin/State for any clubId,
 * or Club only when :clubId matches their account _id or clubId field.
 */
export const ensureStateAdminOrOwnClub = (paramName = "clubId") => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return next(new AppError("Authentication required", 401));
    }

    const role = (user.role || "").toLowerCase();
    if (role === "admin" || role === "state") {
      return next();
    }

    if (role === "club") {
      const raw = String(req.params[paramName] || "").trim();
      if (!raw) {
        return next(new AppError("Forbidden: Insufficient permissions", 403));
      }

      const matchById =
        looksLikeMongoObjectId(raw) && String(user._id) === raw;
      const matchByClubId =
        user.clubId != null && String(user.clubId).trim() === raw;

      if (matchById || matchByClubId) {
        return next();
      }

      return next(
        new AppError("Forbidden: You can only access your own club", 403)
      );
    }

    return next(new AppError("Forbidden: Insufficient permissions", 403));
  };
};

const pickBearerToken = (authHeader) => {
  if (!authHeader) return null;
  return authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;
};

const trimRefreshToken = (raw) => {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length ? t : null;
  }
  return null;
};

const decodeUserIdFromJwt = (token, secret) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, secret);
    return decoded?.id || decoded?._id || decoded?.userId || null;
  } catch {
    try {
      const decoded = jwt.decode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return null;
    }
  }
};

/**
 * Best-effort user id for logout. Never throws — invalid/missing tokens return null.
 */
export const resolveLogoutUserId = (req) => {
  let accessToken = pickBearerToken(req.headers.authorization);
  if (!accessToken && req.cookies?.access_token) {
    accessToken = req.cookies.access_token;
  }

  let userId = decodeUserIdFromJwt(
    accessToken,
    process.env.JWT_ACCESS_SECRET
  );

  if (!userId) {
    const refreshToken =
      trimRefreshToken(req.body?.refreshTokens) ||
      trimRefreshToken(req.body?.refreshToken) ||
      trimRefreshToken(req.headers["x-refresh-token"]) ||
      trimRefreshToken(req.cookies?.refresh_token);

    userId = decodeUserIdFromJwt(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
  }

  return userId;
};

/**
 * For logout: accept a valid access token, or (if missing/expired) a refresh token
 * in body (refreshTokens / refreshToken), x-refresh-token header, or refresh_token cookie.
 */
export const authenticateLogout = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      let accessToken = pickBearerToken(req.headers.authorization);
      if (!accessToken && req.cookies?.access_token) {
        accessToken = req.cookies.access_token;
      }

      let user = null;

      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
          const decodedUserId = decoded?.id || decoded?._id || decoded?.userId;
          user = decodedUserId ? await BaseAuth.findById(decodedUserId) : null;
        } catch (e) {
          if (e.name !== "TokenExpiredError" && e.name !== "JsonWebTokenError") {
            if (e instanceof AppError) return next(e);
            throw e;
          }
        }
      }

      if (!user) {
        let refreshToken =
          trimRefreshToken(req.body?.refreshTokens) ||
          trimRefreshToken(req.body?.refreshToken);

        if (!refreshToken && req.headers["x-refresh-token"]) {
          refreshToken = trimRefreshToken(req.headers["x-refresh-token"]);
        }
        if (!refreshToken && req.cookies?.refresh_token) {
          refreshToken = trimRefreshToken(req.cookies.refresh_token);
        }

        if (!refreshToken) {
          return next(
            new AppError(
              "Access token or valid refresh token required (e.g. Authorization Bearer access token, or refreshTokens in JSON body)",
              401
            )
          );
        }

        try {
          const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
          );
          const decodedUserId = decoded?.id || decoded?._id || decoded?.userId;
          const u = decodedUserId ? await BaseAuth.findById(decodedUserId) : null;
          if (
            !u ||
            !Array.isArray(u.refreshTokens) ||
            !u.refreshTokens.includes(refreshToken)
          ) {
            return next(new AppError("Invalid refresh token", 401));
          }
          user = u;
        } catch (e) {
          if (e instanceof AppError) return next(e);
          if (e.name === "TokenExpiredError") {
            return next(new AppError("Refresh token expired", 401));
          }
          if (e.name === "JsonWebTokenError") {
            return next(new AppError("Invalid refresh token", 401));
          }
          return next(new AppError("Authentication failed", 401));
        }
      }

      if (!user) {
        return next(new AppError("User not found", 401));
      }

      const blockedError = rejectIfUserBlocked(user);
      if (blockedError) {
        return next(blockedError);
      }

      if (allowedRoles.length) {
        const userRole = (user.role || "").toLowerCase();
        const isAllowed = allowedRoles.some(
          (role) => role.toLowerCase() === userRole
        );
        if (!isAllowed) {
          return next(new AppError("Forbidden: Insufficient permissions", 403));
        }
      }

      req.user = user;
      req.token = accessToken || null;
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

    const blockedError = rejectIfUserBlocked(user);
    if (blockedError) {
      throw blockedError;
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
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Refresh token expired or invalid", 401);
  }
});
