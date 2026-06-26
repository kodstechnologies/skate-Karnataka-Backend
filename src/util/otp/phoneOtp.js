// NOTE: No real SMS provider is configured yet. This logs the OTP so the
// flow works end-to-end; wire up an SMS gateway here to actually deliver.
export const sendOTPToPhone = async (phone, otp) => {
    console.log(`[PHONE OTP] to=${phone} otp=${otp}`);
};
