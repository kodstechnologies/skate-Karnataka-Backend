import { authenticate } from "../../middleware/auth.middleware.js";
import { checkPaymentStatus, initiateRazorpayPayment, razorpayWebhook, verifyRazorpayPayment, verifyRazorpayPaymentWeb } from "./payment.controller.js";

const router = Router();

// ================= WEBHOOK (NO AUTH - Must be first) =================
// Razorpay sends webhooks here - no authentication required
router.post('/webhook', razorpayWebhook);

// ================= PROTECTED ROUTES =================

// Initiate payment - accepts userId in params and order data in body
router.post('/initiate/:userId', authenticate(["Skater" ]) ,initiateRazorpayPayment);

// Verify payment after Razorpay checkout success
router.post('/verify',authenticate(["Skater" ]), verifyRazorpayPayment);
router.post('/verify/web',authenticate(["Skater" ]), verifyRazorpayPaymentWeb);

// Check payment status by razorpayOrderId
router.get("/check/:razorpayOrderId",authenticate(["Skater" ]), checkPaymentStatus);

export default router;