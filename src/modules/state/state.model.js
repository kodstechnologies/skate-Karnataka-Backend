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
    stateu: {
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
    }

},
{ timestamps: true }
);

export const State = BaseAuth.discriminator("State", stateSchema);