// models/user.model.js
import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const UserSchema = new mongoose.Schema(
    {
      

       
    
    },
    { timestamps: false }
);

export const User = BaseAuth.discriminator("user", UserSchema);
