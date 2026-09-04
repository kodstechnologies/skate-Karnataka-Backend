import { SESClient } from "@aws-sdk/client-ses";
import { AppError } from "../common/AppError.js";
import {
    AWS_SES_ACCESS_KEY,
    AWS_SES_REGION,
    AWS_SES_SECRET_KEY,
} from "../../config/envConfig.js";

let sesClient;

export const getSesClient = () => {
    if (sesClient) {
        return sesClient;
    }

    console.log("AWS_SES_REGION", AWS_SES_REGION);
    console.log("AWS_SES_ACCESS_KEY", AWS_SES_ACCESS_KEY);
    console.log("AWS_SES_SECRET_KEY", AWS_SES_SECRET_KEY);

    if (!AWS_SES_REGION) {
        throw new AppError("AWS_SES_REGION or AWS_REGION is missing in environment configuration", 500);
    }
    if (!AWS_SES_ACCESS_KEY) {
        throw new AppError("AWS_SES_ACCESS_KEY is missing in environment configuration", 500);
    }
    if (!AWS_SES_SECRET_KEY) {
        throw new AppError("AWS_SES_SECRET_KEY is missing in environment configuration", 500);
    }

    sesClient = new SESClient({
        region: AWS_SES_REGION,
        credentials: {
            accessKeyId: AWS_SES_ACCESS_KEY,
            secretAccessKey: AWS_SES_SECRET_KEY,
        },
    });

    return sesClient;
};
