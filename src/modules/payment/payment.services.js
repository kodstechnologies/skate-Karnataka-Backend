import crypto from "crypto";
import axios from "axios";
import { AppError } from "../../util/common/AppError.js";
import { sendNotification } from "../../util/firebase/sendNotification.js";
import { Payment } from "./payment.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { Event } from "../event/event.model.js";
import { createRegisterFormRepository } from "../event/event.repositories.js";

const getRazorpayCredentials = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new AppError("Razorpay configuration missing", 500);
    }

    return { keyId, keySecret };
};

const toPaise = (amount) => {
    const parsedAmount = Number.parseFloat(amount ?? 0);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        throw new AppError("Invalid event entry fee", 400);
    }
    return Math.round(parsedAmount * 100);
};

const buildReceipt = (eventId) => {
    const idPart = String(eventId || "").slice(-10);
    const timePart = Date.now().toString().slice(-8);
    // Razorpay receipt max length is 40 chars; keep this compact and unique.
    return `ev${idPart}${timePart}`;
};

const verifySignature = (orderId, paymentId, signature) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new AppError("Razorpay configuration missing", 500);
    }

    const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    return expectedSignature === signature;
};

const markParticipantPayment = async (participantId, paymentStatus) => {
    if (!participantId) return;
    await EventParticipant.findByIdAndUpdate(participantId, { paymentStatus });
};

const clearStaleUnpaidRegistrations = async (eventId, userId) => {
    if (!eventId || !userId) return;
    await EventParticipant.deleteMany({
        eventId,
        userId,
        paymentStatus: { $in: ["pending", "failed"] },
    });
};

const handleFailedPayment = async (payment, { paymentId, signature } = {}) => {
    payment.paymentStatus = "failed";
    if (paymentId) {
        payment.razorpayPaymentId = paymentId;
    }
    if (signature) {
        payment.razorpaySignature = signature;
    }

    if (payment.participantId) {
        const participant = await EventParticipant.findById(payment.participantId)
            .select("paymentStatus")
            .lean();
        if (participant && participant.paymentStatus !== "paid") {
            await EventParticipant.findByIdAndDelete(payment.participantId);
            payment.participantId = null;
        }
    }

    await payment.save();
};

const finalizeRegistrationAfterPayment = async (payment) => {
    if (payment.paymentStatus !== "success") {
        return null;
    }

    if (payment.participantId) {
        const participant = await EventParticipant.findById(payment.participantId)
            .select("userId eventId")
            .lean();
        if (!participant) {
            throw new AppError("Payment registration not found", 404);
        }
        await markParticipantPayment(payment.participantId, "paid");
        return participant;
    }

    const payload = payment.registrationPayload;
    if (!payload?.eventId || !payload?.userId) {
        throw new AppError("Payment registration not found", 404);
    }

    const existingPaid = await EventParticipant.findOne({
        eventId: payload.eventId,
        userId: payload.userId,
        paymentStatus: "paid",
    })
        .select("_id userId eventId")
        .lean();

    if (existingPaid) {
        payment.participantId = existingPaid._id;
        await payment.save();
        return existingPaid;
    }

    await clearStaleUnpaidRegistrations(payload.eventId, payload.userId);

    const registration = await createRegisterFormRepository({
        eventId: payload.eventId,
        userId: payload.userId,
        name: payload.name,
        ageGroup: payload.ageGroup,
        categories: payload.categories,
        ...(payload.categoriesId ? { categoriesId: payload.categoriesId } : {}),
        paymentStatus: "paid",
    });

    payment.participantId = registration._id;
    payment.registrationPayload = null;
    await payment.save();

    return registration;
};

const sendEventRegistrationSuccessNotification = async ({
    receiverId,
    eventId,
    participantId,
}) => {
    try {
        const event = await Event.findById(eventId).select("header").lean();
        const eventName = event?.header?.trim() || "your event";

        await sendNotification({
            receiverId,
            title: "Registration successful",
            body: `You're registered for "${eventName}". Payment received — we look forward to seeing you compete!`,
            notificationType: "event",
            data: {
                type: "registration_success",
                eventId: String(eventId),
                participantId: participantId ? String(participantId) : "",
            },
        });
    } catch (error) {
        console.error("Registration success notification failed:", error?.message || error);
    }
};

export const initiateRazorpayPaymentServices = async ({
    userId,
    participantId,
    eventId,
    registrationPayload,
}) => {
    const participant = participantId
        ? await EventParticipant.findOne({ _id: participantId, userId })
        : null;

    if (participantId && !participant) {
        throw new AppError("Registration not found for this user", 404);
    }

    const resolvedEventId = eventId || participant?.eventId || registrationPayload?.eventId;
    if (!resolvedEventId) {
        throw new AppError("eventId is required", 400);
    }

    if (!participantId && !registrationPayload) {
        throw new AppError("Registration data is required to initiate payment", 400);
    }

    const resolvedUserId = userId || participant?.userId || registrationPayload?.userId;
    const existingPaid = await EventParticipant.findOne({
        eventId: resolvedEventId,
        userId: resolvedUserId,
        paymentStatus: "paid",
    }).lean();
    if (existingPaid) {
        throw new AppError("Already registered for this event", 400);
    }

    const event = await Event.findById(resolvedEventId).select("entryFee").lean();
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const amountInPaise = toPaise(event.entryFee || 0);
    if (amountInPaise === 0) {
        if (participant?._id) {
            await markParticipantPayment(participant._id, "paid");
            return {
                isFreeEvent: true,
                amount: 0,
                currency: "INR",
                paymentStatus: "paid",
                participantId: participant._id,
            };
        }

        if (registrationPayload) {
            await clearStaleUnpaidRegistrations(resolvedEventId, resolvedUserId);
            const registration = await createRegisterFormRepository({
                ...registrationPayload,
                paymentStatus: "paid",
            });
            return {
                isFreeEvent: true,
                amount: 0,
                currency: "INR",
                paymentStatus: "paid",
                registration,
            };
        }

        return {
            isFreeEvent: true,
            amount: 0,
            currency: "INR",
            paymentStatus: "paid",
        };
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    let response;
    try {
        response = await axios.post(
            "https://api.razorpay.com/v1/orders",
            {
                amount: amountInPaise,
                currency: "INR",
                receipt: buildReceipt(resolvedEventId),
                notes: {
                    userId: resolvedUserId?.toString?.() || "",
                    eventId: resolvedEventId.toString(),
                    participantId: participant?._id?.toString?.() || "",
                },
            },
            {
                auth: {
                    username: keyId,
                    password: keySecret,
                },
            }
        );
    } catch (error) {
        const message = error?.response?.data?.error?.description || "Razorpay order creation failed";
        throw new AppError(message, 400);
    }
    const order = response.data;

    await Payment.findOneAndUpdate(
        { razorpayOrderId: order.id },
        {
            eventId: resolvedEventId,
            userId: resolvedUserId,
            participantId: participant?._id || null,
            registrationPayload: registrationPayload || null,
            amount: amountInPaise / 100,
            razorpayOrderId: order.id,
            paymentStatus: "pending",
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return {
        isFreeEvent: false,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
    };
};

export const verifyRazorpayPaymentServices = async ({
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
}) => {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError("Payment verification fields are required", 400);
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
        throw new AppError("Payment order not found", 404);
    }

    const wasAlreadySuccessful = payment.paymentStatus === "success";

    const isValidSignature = verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    if (!isValidSignature) {
        await handleFailedPayment(payment, {
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        throw new AppError("Invalid payment signature — registration not completed", 400);
    }

    payment.paymentStatus = "success";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    await payment.save();

    const participant = await finalizeRegistrationAfterPayment(payment);

    if (!wasAlreadySuccessful) {
        const receiverId = userId || participant?.userId || payment.userId;
        const eventId = payment.eventId || participant?.eventId;
        if (receiverId && eventId) {
            await sendEventRegistrationSuccessNotification({
                receiverId,
                eventId,
                participantId: payment.participantId,
            });
        }
    }

    return {
        paymentStatus: payment.paymentStatus,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        participantId: payment.participantId || null,
        registrationComplete: Boolean(payment.participantId),
    };
};

export const verifyRazorpayPaymentWebServices = async (payload) => {
    return verifyRazorpayPaymentServices(payload);
};

export const checkPaymentStatusServices = async ({ razorpayOrderId, userId }) => {
    const payment = await Payment.findOne({ razorpayOrderId }).lean();
    if (!payment) {
        throw new AppError("Payment not found", 404);
    }

    if (payment.participantId) {
        const participant = await EventParticipant.findById(payment.participantId)
            .select("userId")
            .lean();
        if (!participant) {
            throw new AppError("Payment registration not found", 404);
        }
    }

    return {
        orderId: payment.razorpayOrderId,
        paymentId: payment.razorpayPaymentId || null,
        status: payment.paymentStatus,
        amount: payment.amount,
        participantId: payment.participantId || null,
        registrationComplete:
            payment.paymentStatus === "success" && Boolean(payment.participantId),
    };
};

export const razorpayWebhookServices = async ({ body, signature }) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
        const expected = crypto
            .createHmac("sha256", webhookSecret)
            .update(JSON.stringify(body))
            .digest("hex");

        if (expected !== signature) {
            throw new AppError("Invalid webhook signature", 400);
        }
    }

    const eventType = body?.event;
    const paymentEntity = body?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
        return { received: true };
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
        return { received: true };
    }

    if (eventType === "payment.captured") {
        payment.paymentStatus = "success";
        payment.razorpayPaymentId = paymentId || payment.razorpayPaymentId;
        await payment.save();
        await finalizeRegistrationAfterPayment(payment);
    }

    if (eventType === "payment.failed") {
        await handleFailedPayment(payment, { paymentId });
    }

    return { received: true };
};
