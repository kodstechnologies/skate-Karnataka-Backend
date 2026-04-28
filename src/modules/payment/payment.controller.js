import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";

export const razorpayWebhook = asyncHandler(async (req, res) => {
    await razorpayWebhookServices();
    return res.status(200).json(new ApiResponse(200, null, "Webhook successfully done"))
})

export const initiateRazorpayPayment = asyncHandler(async (req, res) => {
    await initiateRazorpayPaymentServices();
    return res.status(200).json(new ApiResponse(200, null, "Webhook successfully done"))
})

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    await verifyRazorpayPaymentServices();
    return res.status(200).json(new ApiResponse(200, null, "Webhook successfully done"))
})

export const verifyRazorpayPaymentWeb = asyncHandler(async (req, rea) => {
    await verifyRazorpayPaymentWebServices();
    return res.status(200).json(new ApiResponse(200, null, "Webhook successfully done"))
})

export const checkPaymentStatus = asyncHandler(async (req, res) => {
    await checkPaymentStatusServices();
    return res.status(200).json(new ApiResponse(200, null, "Webhook successfully done"))
})