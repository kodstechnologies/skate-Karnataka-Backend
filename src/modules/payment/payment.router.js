import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { checkPaymentStatus, initiateRazorpayPayment, razorpayWebhook, verifyRazorpayPayment, verifyRazorpayPaymentWeb } from "./payment.controller.js";

const router = Router();

// ================= WEBHOOK (NO AUTH - Must be first) =================
// Razorpay sends webhooks here - no authentication required
router.post("/v1/webhook", razorpayWebhook);

// ================= PROTECTED ROUTES =================

// Initiate Razorpay order for event registration
router.post("/v1/initiate", authenticate(["Skater"]), initiateRazorpayPayment);

// Verify payment after Razorpay checkout success
router.post("/v1/verify", authenticate(["Skater"]), verifyRazorpayPayment);
router.post("/v1/verify/web", authenticate(["Skater"]), verifyRazorpayPaymentWeb);

// Check payment status by razorpayOrderId
router.get("/v1/check/:razorpayOrderId", authenticate(["Skater"]), checkPaymentStatus);

export default router;