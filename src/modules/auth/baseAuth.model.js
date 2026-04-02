import mongoose from "mongoose";

const options = {
  discriminatorKey: "role",
  timestamps: true,
};

const BaseAuthSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: [true, "Full name is required"],
      minlength: [3, "Minimum 3 characters"],
      maxlength: [50, "Maximum 50 characters"],
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian phone number"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // ❌ REMOVED district (important)

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      lowercase: true,
      trim: true,
    },

    countryCode: {
      type: String,
      default: "+91",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isNotificationsEnabled: {
      type: Boolean,
      default: true,
    },

    refreshTokens: {
      type: [String],
      default: [],
    },

    firebaseTokens: {
      type: [String],
      default: [],
    },

    krsaId: {
      type: String,
      unique: true,
      index: true,
      immutable: true,
    },

    verifay: {
      type: Boolean,
      default: false,
    },
    
  },
  options
);

// ✅ FIXED KRSA ID GENERATION
BaseAuthSchema.pre("save", async function () {
  if (this.krsaId) return;

  const rolePrefixMap = {
    Skater: "S",
    Parent: "P",
    School: "SC",
    Academy: "A",
    Officials: "O",
    Guest: "G",
  };

  const prefix = rolePrefixMap[this.role] || "U";

  let attempts = 0;

  while (attempts < 15) {
    const random = Math.floor(100000 + Math.random() * 900000);
    const newId = `KRSA${random}${prefix}`;

    const exists = await this.constructor.findOne({ krsaId: newId });

    if (!exists) {
      this.krsaId = newId;
      return;
    }

    attempts++;
  }

  throw new Error("Failed to generate KRSA ID");
});

export const BaseAuth = mongoose.model("BaseAuth", BaseAuthSchema);