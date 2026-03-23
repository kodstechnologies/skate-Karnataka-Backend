import axios from 'axios';
import { SENDER_ID, TEMPLATE_ID } from '../../config/envConfig.js';

export const sendSMS = async ({ number, message, senderId = SENDER_ID, templateId = TEMPLATE_ID }) => {

    const payload = {
        message,
        senderId,
        number,
        templateId,
    };

    try {
        console.log("Sending SMS...");

        const response = await axios.post(
            'https://smsapi.edumarcsms.com/api/v1/sendsms',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': '01a2c7b172a74897bc9bf5e5ac7bf998'  // Your API key
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('SMS Provider Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send SMS');
    }
};
