import { SendEmailCommand } from "@aws-sdk/client-ses";
import { AWS_SES_FROM_EMAIL, AWS_SES_FROM_NAME } from "../../config/envConfig.js";
import { getSesClient } from "../../util/aws/ses-client.js";
import { AppError } from "../../util/common/AppError.js";

const toAddressList = (value) => {
    if (!value) {
        return [];
    }

    const list = Array.isArray(value) ? value : String(value).split(",");
    return list.map((item) => String(item).trim()).filter(Boolean);
};

const buildSource = (from) => {
    if (from) {
        const trimmed = String(from).trim();
        if (!trimmed) {
            throw new AppError("Sender email is required", 500);
        }
        if (trimmed.includes("<")) {
            return trimmed;
        }
        const name = AWS_SES_FROM_NAME?.trim() || "KRSA";
        return `"${name}" <${trimmed}>`;
    }

    const email = AWS_SES_FROM_EMAIL?.trim();
    if (!email) {
        throw new AppError(
            "AWS_SES_FROM_EMAIL is missing in environment configuration",
            500
        );
    }

    const name = AWS_SES_FROM_NAME?.trim() || "KRSA";
    return `"${name}" <${email}>`;
};

const mapSesError = (err) => {
    if (err instanceof AppError) {
        return err;
    }

    const name = err?.name || err?.Code || "";
    const message = err?.message || String(err);
    const lowered = message.toLowerCase();

    if (name === "MessageRejected" || lowered.includes("email address is not verified")) {
        return new AppError(
            "Amazon SES rejected the email. In sandbox mode both the sender and recipient must be verified identities.",
            502
        );
    }

    if (
        name === "MailFromDomainNotVerifiedException" ||
        lowered.includes("mail from domain")
    ) {
        return new AppError("The Amazon SES sender domain is not verified", 502);
    }

    if (name === "AccountSendingPausedException" || lowered.includes("sending paused")) {
        return new AppError("Amazon SES sending is paused for this account", 502);
    }

    if (name === "ConfigurationSetDoesNotExistException") {
        return new AppError("The Amazon SES configuration set does not exist", 502);
    }

    if (name === "Throttling" || name === "TooManyRequestsException") {
        return new AppError("Amazon SES rate limit exceeded. Please try again shortly", 429);
    }

    if (name === "InvalidParameterValue" || name === "InvalidParameterValueException") {
        return new AppError("Invalid email parameters were sent to Amazon SES", 400);
    }

    if (name === "AccessDeniedException" || lowered.includes("not authorized") || lowered.includes("access denied")) {
        return new AppError("AWS credentials are not authorized to send email with Amazon SES", 502);
    }

    console.error("[email] Amazon SES send failed:", name || "UnknownError", message);
    return new AppError("Failed to send email via Amazon SES", 502);
};

/**
 * Reusable Amazon SES mailer.
 * Accepts the same options previously used with Nodemailer: to, subject, text, html, from, cc, bcc, replyTo.
 */
export const sendMail = async (mailOptions = {}) => {
    const to = toAddressList(mailOptions.to);
    if (to.length === 0) {
        throw new AppError("Recipient email is required", 400);
    }

    if (!mailOptions.subject) {
        throw new AppError("Email subject is required", 400);
    }

    if (!mailOptions.html && !mailOptions.text) {
        throw new AppError("Email body is required", 400);
    }

    const body = {};
    if (mailOptions.text) {
        body.Text = { Data: String(mailOptions.text), Charset: "UTF-8" };
    }
    if (mailOptions.html) {
        body.Html = { Data: String(mailOptions.html), Charset: "UTF-8" };
    }

    const destination = { ToAddresses: to };
    const cc = toAddressList(mailOptions.cc);
    const bcc = toAddressList(mailOptions.bcc);
    if (cc.length) {
        destination.CcAddresses = cc;
    }
    if (bcc.length) {
        destination.BccAddresses = bcc;
    }

    const params = {
        Source: buildSource(mailOptions.from),
        Destination: destination,
        Message: {
            Subject: { Data: String(mailOptions.subject), Charset: "UTF-8" },
            Body: body,
        },
    };

    const replyTo = toAddressList(mailOptions.replyTo);
    if (replyTo.length) {
        params.ReplyToAddresses = replyTo;
    }

    try {
        const response = await getSesClient().send(new SendEmailCommand(params));
        return {
            messageId: response.MessageId,
            response,
        };
    } catch (err) {
        throw mapSesError(err);
    }
};
