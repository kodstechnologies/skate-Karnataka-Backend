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
  notificationType = "general",
  sentBy = null
}) => {

  try {

    // Find receiver
    const auth = await BaseAuth.findById(receiverId)
      .select("firebaseTokens role");

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
      sentBy
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
    const messaging = fintApp.messaging();

    const response = await messaging.sendEachForMulticast({
      tokens: auth.firebaseTokens,

      notification: {
        title,
        body
      },

      data: {
        ...Object.fromEntries(
          Object.entries(data).map(
            ([k,v]) => [k,String(v)]
          )
        ),
        receiverId: receiverId.toString(),
        notificationType
      }
    });

    console.log(
      `Notification sent to ${receiverId}`,
      response.successCount
    );

  } catch(error) {
    console.error(
      "sendNotification error:",
      error.message
    );
  }

};