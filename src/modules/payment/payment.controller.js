import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    checkPaymentStatusServices,
    initiateRazorpayPaymentServices,
    razorpayWebhookServices,
    verifyRazorpayPaymentServices,
    verifyRazorpayPaymentWebServices,
} from "./payment.services.js";

export const razorpayWebhook = asyncHandler(async (req, res) => {
    const result = await razorpayWebhookServices({
        body: req.body,
        signature: req.headers["x-razorpay-signature"],
    });
    return res.status(200).json(new ApiResponse(200, result, "Webhook processed successfully"));
});

export const initiateRazorpayPayment = asyncHandler(async (req, res) => {
    const result = await initiateRazorpayPaymentServices({
        userId: req.user._id,
        participantId: req.body?.participantId,
        eventId: req.body?.eventId,
    });
    return res.status(200).json(new ApiResponse(200, result, "Payment order created successfully"));
});

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const result = await verifyRazorpayPaymentServices({
        userId: req.user._id,
        ...req.body,
    });
    return res.status(200).json(new ApiResponse(200, result, "Payment verified successfully"));
});

export const verifyRazorpayPaymentWeb = asyncHandler(async (req, res) => {
    const result = await verifyRazorpayPaymentWebServices({
        userId: req.user._id,
        ...req.body,
    });
    return res.status(200).json(new ApiResponse(200, result, "Web payment verified successfully"));
});

export const checkPaymentStatus = asyncHandler(async (req, res) => {
    const result = await checkPaymentStatusServices({
        razorpayOrderId: req.params.razorpayOrderId,
        userId: req.user._id,
    });
    return res.status(200).json(new ApiResponse(200, result, "Payment status fetched successfully"));
});