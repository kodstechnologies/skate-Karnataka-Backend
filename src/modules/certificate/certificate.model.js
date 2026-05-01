import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BaseAuth",
            required: false,
        },
        winnerKRSAId: {
            type: String,
            required: true,
        },
       
         pdfUrl: {
      type: String,
      required: true,
      trim: true,
      },
      filename:{
         type:String,
         trim:true,
         require:true
      },
       

        clubAllow: {
            type: Boolean,
            default: false
        },

        districtAllow: {
            type: Boolean,
            default: false
        },

        stateAllow: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export const Certificate = mongoose.model("Certificate", certificateSchema);