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
      required: true,
      index: true,
    },

    districtName: {
      type: String,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    img: {
      type: String,
      default: "",
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    about: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    skaters: {
      type: Number,
      default: 0,
      min: 0,
    },

    medals: {
      type: Number,
      default: 0,
      min: 0,
    },

    events: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);


// ✅ Unique club per district
clubSchema.index({ name: 1, district: 1 }, { unique: true });


// ✅ Auto set districtName (optimized)
clubSchema.pre("save", async function (next) {
  if (!this.isModified("district")) return next();

  const district = await mongoose.models.District
    .findById(this.district)
    .select("name")
    .lean();

  if (district) {
    this.districtName = district.name;
  }

  next();
});


// ✅ Generate unique clubId (optimized)
clubSchema.pre("save", async function (next) {
  if (this.clubId) return next();

  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `KRSA-CLB-${random}`;

    exists = await mongoose.models.Club.exists({ clubId: generatedId });

    if (!exists) {
      this.clubId = generatedId;
    }
  }

  next();
});


// ✅ Virtual (enable in JSON)
clubSchema.virtual("skaterCount", {
  ref: "BaseAuth",
  localField: "_id",
  foreignField: "club",
  count: true,
});

clubSchema.set("toJSON", { virtuals: true });
clubSchema.set("toObject", { virtuals: true });


export const Club = mongoose.model("Club", clubSchema);