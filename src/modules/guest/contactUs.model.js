import mongoose from "mongoose";

const contactUSSchema = new mongoose.Schema(
{
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  }
},
{
  timestamps: true
}
);

export const ContactUS = mongoose.model(
  "ContactUS",
  contactUSSchema
);