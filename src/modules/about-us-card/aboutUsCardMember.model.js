import mongoose from "mongoose";

const aboutUsCardMemberSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AboutUsCard",
      required: true,
      index: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    photo: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    phoneNo: {
      type: String,
      trim: true,
      default: "",
      maxlength: 10,
      validate: {
        validator: (v) => !v || /^\d{10}$/.test(v),
        message: "Phone number must be exactly 10 digits"
      }
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
    }
  },
  { timestamps: true }
);

const AboutUsCardMember = mongoose.model("AboutUsCardMember", aboutUsCardMemberSchema);
export default AboutUsCardMember;
