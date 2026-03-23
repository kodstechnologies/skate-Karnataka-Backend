import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model";

const skaterSchema = new mongoose.Schema(

)
export const Skater = BaseAuth.discriminator("Skater", skaterSchema)