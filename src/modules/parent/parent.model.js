import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const parentSchema = new mongoose.Schema(

)
export const Parent = BaseAuth.discriminator("Parent", parentSchema);