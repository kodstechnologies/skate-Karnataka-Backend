// models/admin.model.js
import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const AdminSchema = new mongoose.Schema({

});

export const Admin = BaseAuth.discriminator("admin", AdminSchema);
