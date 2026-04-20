import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
  {
    clubId: {
      type: String,
      unique: true,
      index: true,
    },

    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: [true, "District is required"],
      index: true,
    },

    districtName: {
      type: String,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Club name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    img: {
      type: String,
      default: "",
      match: [
        /^(https?:\/\/.*\.(?:png|jpg|jpeg|webp))?$/,
        "Please use a valid image URL",
      ],
    },

    address: {
      type: String,
      trim: true,
      maxlength: [200, "Address too long"],
    },

    about: {
      type: String,
      trim: true,
      maxlength: [500, "About section max 500 characters"],
    },

    skaters: {
      type: Number,
      default: 0,
      min: [0, "Skaters cannot be negative"],
    },

    medals: {
      type: Number,
      default: 0,
    },

    events: {
      type: Number,
      default: 0,
      min: [0, "Championships cannot be negative"],
    },
  },
  { timestamps: true }
);


// ✅ Unique club name inside same district
clubSchema.index({ name: 1, district: 1 }, { unique: true });


// ✅ Auto set districtName
clubSchema.pre("save", async function (next) {
  try {
    if (this.district && !this.districtName) {
      const district = await mongoose.models.District.findById(this.district);
      if (district) {
        this.districtName = district.name;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});


// ✅ Safe unique clubId generator
clubSchema.pre("save", async function (next) {
  try {
    if (!this.clubId) {
      let generatedId;
      let exists = true;

      while (exists) {
        const random = Math.floor(1000 + Math.random() * 9000);
        generatedId = `KRSA-CLB-${random}`;

        exists = await mongoose.models.Club.exists({ clubId: generatedId });
      }

      this.clubId = generatedId;
    }

    next();
  } catch (error) {
    next(error);
  }
});


// ✅ Virtual field (BEST PRACTICE instead of storing skaters)
clubSchema.virtual("skaterCount", {
  ref: "BaseAuth",
  localField: "_id",
  foreignField: "club",
  count: true,
});


export const Club = mongoose.model("Club", clubSchema);