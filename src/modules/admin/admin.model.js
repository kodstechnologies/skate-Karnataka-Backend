// models/admin.model.js
import mongoose from "mongoose";
import crypto from "crypto";
import { promisify } from "util";
import { BaseAuth } from "../auth/baseAuth.model.js";

const scryptAsync = promisify(crypto.scrypt);

const hashPassword = async (plainPassword) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = await scryptAsync(plainPassword, salt, 64);
    return `${salt}:${derivedKey.toString("hex")}`;
};

const verifyPassword = async (storedPassword, plainPassword) => {
    if (!storedPassword || !storedPassword.includes(":")) {
        return false;
    }
    const [salt, key] = storedPassword.split(":");
    const derivedKey = await scryptAsync(plainPassword, salt, 64);
    const storedKeyBuffer = Buffer.from(key, "hex");
    return (
        storedKeyBuffer.length === derivedKey.length &&
        crypto.timingSafeEqual(storedKeyBuffer, derivedKey)
    );
};

const AdminSchema = new mongoose.Schema({
    password: {
            type: String,
            required:true,
        },
          img: {
      type: String,
      default: null,
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },
});

AdminSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    this.password = await hashPassword(this.password);
});

AdminSchema.methods.isPasswordCorrect = async function (plainPassword) {
    return verifyPassword(this.password, plainPassword);
};

export const Admin = BaseAuth.discriminator("admin", AdminSchema);
