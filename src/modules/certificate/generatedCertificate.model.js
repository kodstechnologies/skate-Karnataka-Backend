import mongoose from "mongoose";

const generatedCertificateSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        participantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EventParticipant",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BaseAuth",
        },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CertificateTemplate",
            required: true,
        },
        certificateID: {
            type: String,
            trim: true,
        },
        winnerKRSAId: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        ageGroup: {
            type: String,
            trim: true,
        },
        clubName: {
            type: String,
            trim: true,
            default: "",
        },
        issueDate: {
            type: String,
            trim: true,
        },
        pdfUrl: {
            type: String,
            required: true,
            trim: true,
        },
        filename: {
            type: String,
            trim: true,
        },
        events: [
            {
                event: { type: String, trim: true },
                discipline: { type: String, trim: true },
                distance: { type: String, trim: true },
                placement: { type: String, trim: true },
            },
        ],
    },
    { timestamps: true }
);

generatedCertificateSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

export const GeneratedCertificate = mongoose.model(
    "GeneratedCertificate",
    generatedCertificateSchema
);
