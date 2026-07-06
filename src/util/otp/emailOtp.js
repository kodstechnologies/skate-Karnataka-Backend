import nodemailer from "nodemailer";

let transporter;

export const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        throw new Error("EMAIL_USER / EMAIL_PASS are not configured in environment");
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });

    return transporter;
};

const buildOtpEmailHtml = (otp) => {
    const digits = String(otp)
        .split("")
        .map(
            (d) => `
                          <td style="padding:0 6px;">
                            <div style="width:46px;height:56px;line-height:56px;border-radius:10px;background:#f1f5ff;border:1px solid #dbe4ff;color:#1a3fb0;font-size:26px;font-weight:700;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">${d}</div>
                          </td>`
        )
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KRSA Login OTP</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(20,40,90,0.08);font-family:'Segoe UI',Arial,sans-serif;">
            <tr>
              <td style="background:linear-gradient(135deg,#1a3fb0,#3b82f6);padding:28px 32px;">
                <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">KRSA</div>
                <div style="color:#dbe4ff;font-size:13px;margin-top:4px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:20px;font-weight:700;">Verify your login</h1>
                <p style="margin:0;color:#475569;font-size:14px;line-height:22px;">
                  Use the One-Time Password (OTP) below to securely continue signing in to your KRSA account.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>${digits}</tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 4px 32px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;">This code expires in <strong style="color:#1a3fb0;">5 minutes</strong>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 16px;">
                  <p style="margin:0;color:#9a3412;font-size:12px;line-height:18px;">
                    For your security, never share this code with anyone. KRSA will never ask you for your OTP.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:18px;">
                  Didn't request this? You can safely ignore this email.<br />
                  &copy; ${new Date().getFullYear()} KRSA. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const sendOTPToEmail = async (email, otp) => {
    const to = String(email?.email ?? email).trim();
    if (!to) {
        throw new Error("Recipient email is required to send OTP");
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `${otp} is your KRSA login OTP`,
        text: `Your KRSA login OTP is ${otp}. It is valid for 5 minutes. Do not share it with anyone.`,
        html: buildOtpEmailHtml(otp),
    });
};
