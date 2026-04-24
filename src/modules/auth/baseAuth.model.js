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

    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      index: true,
    },

   
    gender: {
      type: String,
      // enum: ["male", "female", "other"],
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
      
    verify: {
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
    Scademy: "A",
    State: "ST",
    Official: "O",
    Admin: "AD",
    Guest: "G",
    Club: "CL",
    District: "D",
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

// Remove legacy unique index created when Club fields were on BaseAuth.
// That index makes registration fail with:
// E11000 duplicate key error ... index: clubId_1 dup key: { clubId: null }
BaseAuth.on("index", async () => {
  try {
    const indexes = await BaseAuth.collection.indexes();
    const legacyIndexNames = indexes
      .filter((idx) => {
        const key = idx.key || {};
        const isClubIdIndex = idx.name === "clubId_1" || Object.keys(key).join(",") === "clubId";
        const isNameDistrictIndex =
          idx.name === "name_1_district_1" ||
          idx.name === "district_1_name_1" ||
          (Object.prototype.hasOwnProperty.call(key, "name") &&
            Object.prototype.hasOwnProperty.call(key, "district"));

        return isClubIdIndex || isNameDistrictIndex;
      })
      .map((idx) => idx.name)
      .filter(Boolean);

    for (const indexName of legacyIndexNames) {
      await BaseAuth.collection.dropIndex(indexName);
    }
  } catch {
    // Ignore cleanup errors to avoid blocking app startup.
  }
});