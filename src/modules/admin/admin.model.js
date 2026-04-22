// models/admin.model.js
import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

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

export const Admin = BaseAuth.discriminator("admin", AdminSchema);
