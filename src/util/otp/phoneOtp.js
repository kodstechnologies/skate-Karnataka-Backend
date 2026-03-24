import { generateRandomNumber } from "../token/token.js"

export const sendOTPToPhone = (phone) =>{
console.log(phone,"otp")
const otp = generateRandomNumber();
console.log(otp,"otp")
}