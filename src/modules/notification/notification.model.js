import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
{
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BaseAuth",
    required: true,
    index: true
  },

  receiverRole: {
    type: String,
    enum: [
      "Skater",
      "Parent",
      "School",
      "Academy",
      "Scademy",
      "State",
      "Official",
      "Admin",
      "admin",
      "Guest",
      "Club",
      "District"
    ],
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  body: {
    type: String,
    required: true,
    trim: true
  },

  link: {
    type: String,
    default: ""
  },

  img: {
    type: String,
    default: ""
  },

  notificationType: {
    type: String,
    enum: [
      "report",
      "approval",
      "event",
      "competition",
      "message",
      "announcement",
      "general"
    ],
    default: "general"
  },

  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BaseAuth"
  },
  senderRole: {
    type: String,
    enum: [
      "Skater",
      "Parent",
      "School",
      "Academy",
      "Scademy",
      "State",
      "Official",
      "Admin",
      "admin",
      "Guest",
      "Club",
      "District"
    ],
    default: null
  }

},
{
  timestamps:true
}
);

notificationSchema.index({
  receiverId:1,
  createdAt:-1
});

export const Notification = mongoose.model(
 "Notification",
 notificationSchema
);