import jwt from "jsonwebtoken";
import { JWT_ACCESS_EXPIRES, JWT_ACCESS_SECRET, JWT_REFRESH_EXPIRES, JWT_REFRESH_SECRET } from "../../config/envConfig.js";

// Generate Random Number with Custom Length
const generateRandomNumber = (length = 6) => {
    let randomNumber = "";

    for (let i = 0; i < length; i++) {
        randomNumber += Math.floor(Math.random() * 10);
    }

    return randomNumber;
};


// 🔐 Generate Access Token
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
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
            id: user._id
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
