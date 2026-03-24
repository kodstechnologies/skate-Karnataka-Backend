import { generateRandomNumber } from "../token/token.js"

export const sendOTPToEmail = (email) =>{
console.log(email,"otp")
const otp = generateRandomNumber();
console.log(otp,"otp")
}