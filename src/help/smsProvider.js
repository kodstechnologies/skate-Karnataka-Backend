
import axios from 'axios';
// import { SENDER_ID, TEMPLATE_ID } from "../config/config.dotenv.js";

export const sendSMS = async ({ number, message, senderId = SENDER_ID, templateId = TEMPLATE_ID }) => {

    const payload = {
        message,
        senderId,
        number,
        templateId,
    };
    console.log("🚀 ~ sendSMS ~ payload:", payload)

    try {
        console.log("Sending SMS...");

        const response = await axios.post(
            'https://smsapi.edumarcsms.com/api/v1/sendsms',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'f8b010b9620648b0b11a4422e6ae5bdb'  // Your API key
                }
            }
        );
        console.log("🚀 ~ sendSMS ~ response:", response.data)

        return response.data;
        return { success: true, message: 'SMS sent successfully (mock)' };
    } catch (error) {
        console.error('SMS Provider Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send SMS');
    }
};
