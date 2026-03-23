import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model";

const schoolSchema = new mongoose.Schema(

)

export const School = BaseAuth.discriminator("School", schoolSchema);