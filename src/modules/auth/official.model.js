import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model";

const officialSchema = new mongoose.Schema(

)

export const Official = BaseAuth.discriminator("Official", officialSchema);