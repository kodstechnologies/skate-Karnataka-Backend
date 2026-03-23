import { Mongoose } from "mongoose";
import { BaseAuth } from "./baseAuth.model";

const academySchema = new Mongoose.Schema({

})

export const Academy = BaseAuth.discriminator("Academy" , academySchema);