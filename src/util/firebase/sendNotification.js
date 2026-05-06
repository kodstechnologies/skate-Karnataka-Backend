import admin from "../../firebase/firebase.js";
import { BaseAuth } from "../../modules/auth/baseAuth.model.js";
import { Notification } from "../../modules/notification/notification.model.js";

export const sendNotification = async ({
  receiverId,
  title,
  body,
  link = "",
  img = "",
  data = {},
  notificationType = "general",
  sentBy = null
}) => {

  try {

    // Find receiver
    const auth = await BaseAuth.findById(receiverId)
      .select("firebaseTokens role");
    const sender = sentBy
      ? await BaseAuth.findById(sentBy).select("role")
      : null;
    const senderRole = sender?.role || null;
    console.log(auth, "00000000000000000000000")
    if (!auth) {
      console.log(`Receiver not found: ${receiverId}`);
      return;
    }

    // Save in DB
    await Notification.create({
      receiverId,
      receiverRole: auth.role,
      title,
      body,
      link,
      img,
      notificationType,
      sentBy,
      senderRole
    });

    // No device tokens → only save notification
    if (
      !auth.firebaseTokens ||
      !auth.firebaseTokens.length
    ) {
      console.log(
        `No FCM tokens for receiver ${receiverId}`
      );
      return;
    }

    // Send push notification
    const messaging = admin.messaging();
    console.log(messaging, "messaging===")
    const response = await messaging.sendEachForMulticast({
      tokens: auth.firebaseTokens,

      notification: {
        title,
        body
      },

      data: {
        ...Object.fromEntries(
          Object.entries(data).map(
            ([k, v]) => [k, String(v)]
          )
        ),
        receiverId: receiverId.toString(),
        receiverRole: String(auth.role || ""),
        senderRole: String(senderRole || ""),
        notificationType
      }
    });

    console.log(
      `Notification sent to ${receiverId}`,
      response.successCount
    );
    console.log(response, "=============")
  } catch (error) {
    console.error(
      "sendNotification error:",
      error.message
    );
  }

};