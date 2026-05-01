import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BaseAuth"
    },

    name: String,
    age: Number,
    category: String,

    paymentStatus: {
        type: String,
        default: "pending"
    }

}, { timestamps: true });

export const EventParticipant =
    mongoose.model(
        "EventParticipant",
        participantSchema
    );