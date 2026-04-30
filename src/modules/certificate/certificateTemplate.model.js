import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
    {
        pdfUrl: {
            type: String,
            required: true,
            trim: true,
        },
        layout: {
            type: Object,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true
    }
);

export const CertificateTemplate = mongoose.model("CertificateTemplate", certificateTemplateSchema);
