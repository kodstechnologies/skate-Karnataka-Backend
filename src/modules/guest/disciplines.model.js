import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const disciplinesSchema = new mongoose.Schema({
  img: {
    type: String,
  },
  title: {
    type: String,
    required: true,
  },
  text: {
    type: String,
  },
  about: {
    type: String,
  }
}, {
  timestamps: true
});

export const Disciplines = BaseAuth.discriminator(
  "Disciplines",
  disciplinesSchema
);