import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    districtKrsaId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "District name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    img: {
      type: String,
      default: "",
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },
    about: {
      type: String,
      trim: true,
    },
    officeAddress: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    rank: {
      type: Number,
      default: 0,
      min: 0,
    },
    championships: {
      type: Number,
      default: 0,
      min: 0,
    },
    presidentName: {
      type: String,
    },
    verify: {
      type: Boolean,
      default: false,
    },

    club: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BaseAuth",
      },
    ],
  },
  { timestamps: true }
);

districtSchema.index({ name: 1 }, { unique: true });
districtSchema.path("members").default(() => []);

districtSchema.pre("save", async function () {
  if (this.districtKrsaId) return;

  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `KRSA-DST-${random}`;

    exists = await mongoose.models.District.exists({
      districtKrsaId: generatedId,
    });

    if (!exists) {
      this.districtKrsaId = generatedId;
    }
  }
});

export const District = mongoose.model("District", districtSchema);