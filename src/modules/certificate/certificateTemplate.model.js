import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
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
            default: false,
        },
        isApplyClub: {
            type: Boolean,
            default: false,
        },
        isApplyDistrict: {
            type: Boolean,
            default: false,
        },
        isApplyState: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export const CertificateTemplate = mongoose.model("CertificateTemplate", certificateTemplateSchema);

