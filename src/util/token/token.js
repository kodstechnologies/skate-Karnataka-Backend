import jwt from "jsonwebtoken";
import { JWT_ACCESS_EXPIRES, JWT_ACCESS_SECRET, JWT_REFRESH_EXPIRES, JWT_REFRESH_SECRET } from "../../config/envConfig.js";

// Generate Random Number with Custom Length
const generateRandomNumber = (length = 4) => {
    let randomNumber = "1234";

    // for (let i = 0; i < length; i++) {
    //     randomNumber += Math.floor(Math.random() * 10);
    // }

    return randomNumber;
};


// 🔐 Generate Access Token
const generateAccessToken = (user) => {
    // console.log("🚀 ~ generateAccessToken ~ user:", user)
    return jwt.sign(
        {
            id: user.id || user._id || user.userId,
            role: user.role
        },
        JWT_ACCESS_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRES } // short expiry
    );
};


// 🔁 Generate Refresh Token
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id || user._id || user.userId,
            role: user.role
        },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES } // long expiry
    );
};

export {
    generateRandomNumber,
    generateAccessToken,
    generateRefreshToken
};
