import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BaseAuth",
        },

        participantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EventParticipant",
        },

        /** Stored until payment succeeds; then EventParticipant is created. */
        registrationPayload: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        amount: {
            type: Number,
            required: true
        },

        paymentMethod: {
            type: String,
            default: "razorpay"
        },

        // Razorpay Order ID
        razorpayOrderId: {
            type: String,
            required: true
        },

        // After successful payment
        razorpayPaymentId: {
            type: String
        },

        razorpaySignature: {
            type: String
        },

        transactionId: {
            type: String
        },

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "success",
                "failed",
                "refunded"
            ],
            default: "pending"
        }

    },
    { timestamps: true }
);

export const Payment =
    mongoose.model("Payment", paymentSchema);