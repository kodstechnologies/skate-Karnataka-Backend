import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const stateSchema = new mongoose.Schema(
{
    name: {
        type: String,
        default: "Karnataka",
        enum: ["Karnataka"]
    },

    // true = active, false = inactive
    status: {
        type: Boolean,
        default: true
    },

    allowedModule: [
        {
            type: String
        }
    ],
    img:{
      type:String ,
      default:""
    },
    officialAddress: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    }

},
{ timestamps: true }
);

export const State = BaseAuth.discriminator("State", stateSchema);