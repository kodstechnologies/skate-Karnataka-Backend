import mongoose from "mongoose";

const { Schema } = mongoose;

const manualEventSchema = new Schema(
  {
    // Basic Event Details
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "cancelled"],
      default: "draft",
    },

    entryFee: {
      type: Number,
      min: [0, "Entry fee cannot be negative"],
      default: 0,
    },

    eventCategory: {
      type: String,
      trim: true,
      default: null,
    },

    discipline: {
      type: String,
      trim: true,
      default: null,
    },

    // Registration Dates
    registrationStartDate: {
      type: Date,
      default: null,
    },

    registrationEndDate: {
      type: Date,
      default: null,
    },

    // Event Dates
    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    // Event Timings
    eventStartTime: {
      type: String, // Example: "09:00 AM"
      trim: true,
      default: null,
    },

    eventEndTime: {
      type: String, // Example: "05:00 PM"
      trim: true,
      default: null,
    },

    // Event Address
    address: {
      type: String,
      trim: true,
      default: null,
    },

    // Event Styling
    backgroundColor1: {
      type: String,
      trim: true,
      default: "#FFFFFF",
    },

    backgroundColor2: {
      type: String,
      trim: true,
      default: "#F3F4F6",
    },

    textColor: {
      type: String,
      trim: true,
      default: "#000000",
    },

    // Circular / Official Document Upload
    circularDocument: {
      type: String,
      default: null,
    },

    // Excel Template for Skater Registration
    excelTemplate: {
      type: String,
      default: null,
    },

    // Skater Attendance
    attendance: [
      {
        districtId: {
          type: Schema.Types.ObjectId,
          ref: "District",
          default: null,
        },

        districtName: {
          type: String,
          trim: true,
          default: null,
        },

        stateName: {
          type: String,
          trim: true,
          default: null,
        },

        skaterExcelDocument: {
          type: String,
          required: true,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
manualEventSchema.index({ status: 1 });
manualEventSchema.index({ startDate: 1 });
manualEventSchema.index({ eventCategory: 1 });
manualEventSchema.index({ discipline: 1 });

const ManualEvent = mongoose.model("ManualEvent", manualEventSchema);

export default ManualEvent;