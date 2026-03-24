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
      minlength: [3, "Full name must be at least 3 characters"],
      maxlength: [50, "Full name cannot exceed 50 characters"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      index: true,
      trim: true,
      minlength: [10, "Phone number must be exactly 10 digits"],
      maxlength: [10, "Phone number must be exactly 10 digits"],
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian phone number"],
    },

    address: {
      type: String,
      trim: true,
      minlength: [5, "Address must be at least 5 characters"],
      maxlength: [200, "Address cannot exceed 200 characters"],
    },

    district: {
      type: String,
      trim: true,
      required: [true, "District is required"],
    },

    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other",
      },
      lowercase: true,
      trim: true,
    },

    countryCode: {
      type: String,
      default: "+91",
    },

    photo: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    dob: {
      type: Date,
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
  },
  options
);

// ==================== PRE-SAVE HOOK FOR KRSA ID (Best Version) ====================

BaseAuthSchema.pre("save", async function () {
  // Skip if already has krsaId (useful during updates)
  if (this.krsaId) {
    return;
  }

  const rolePrefixMap = {
    skater: "S",
    parent: "P",
    school: "SC",
    academy: "A",
    officials: "O",
    guest: "G",
  };

  const prefix = rolePrefixMap[this.role] || "U";

  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const newId = `KRSA${randomNumber}${prefix}`;

    const existing = await this.constructor
      .findOne({ krsaId: newId })
      .lean();

    if (!existing) {
      this.krsaId = newId;
      return;                    // Success → exit middleware
    }

    attempts++;
  }

  // If we reach here → failed to generate unique ID
  throw new Error("Failed to generate unique KRSA ID after 15 attempts");
});

export const BaseAuth = mongoose.model("BaseAuth", BaseAuthSchema);