import { fintApp } from "../../firebase.js";
import { BaseAuth } from "../../modules/auth/model/baseAuth.model.js";
import { Notification } from "../../modules/notification/model/notification.model.js";

export const sendNotification = async ({
    receiverId,
    title,
    body,
    link = "",
    img = "",
    data = {},
    notificationType = "",
}) => {
    try {
        // 🔍 Get user / venture / any role
        const auth = await BaseAuth.findById(receiverId).select("firebaseTokens");

        if (!auth || !auth.firebaseTokens?.length) {
            console.log(`⚠️ No FCM tokens for receiver: ${receiverId}`);
            return;
        }

        // 💾 Save notification
        await Notification.create({
            receiverId,
            title,
            body,
            link,
            img,
            notificationType,
        });

        // 📡 Send FCM
        const messaging = fintApp.messaging();

        await messaging.sendEachForMulticast({
            tokens: auth.firebaseTokens,
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                receiverId: receiverId.toString(),
                notificationType,
            },
        });

        console.log(`✅ Notification sent to ${receiverId}`);
    } catch (error) {
        console.error("❌ sendNotification error:", error.message);
    }
};
