import { generateRandomNumber } from "../../util/token/token.js";
import { BaseAuth } from "./baseAuth.model.js";
import { Otp } from "./otp.model.js";
import { Skater } from "./skater.model.js";

const registerUser = async (userData) => {
    const user = await new BaseAuth(userData).save();
    return user;
};

const isExistEmail = async (email) => {
    const isEmail = await BaseAuth.findOne({ email })
    return isEmail;
}

const removeOldEmailOtp = async (email) => {
    console.log(email, "uuuu")
    await Otp.findOneAndDelete(email);
    console.log(email, "uuuu")
}

const saveEmailOtp = async (email, otp, id) => {
    await Otp.create({
        userId: id,
        email: email.email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const checkEmailOTP = async (email) => {
    const record = await Otp.findOne({ email });
    return record;
}

const isExistPhone = async (phone) => {
    console.log(phone, "phone")
    const isPhone = await BaseAuth.findOne({ phone })
    return isPhone;
}
const isExistKSRAId = async (krsaId) => {
    console.log(krsaId, "krsaId")
    const iskrsaId = await BaseAuth.findOne({ krsaId })
    return iskrsaId;
}

const removeOldPhoneOtp = async (phone) => {
    await Otp.findOneAndDelete(phone);
}
const removeOldKRSAIdOtp = async (krsaId) => {
    await Otp.findOneAndDelete(krsaId);
}

const savePhoneOTP = async (phone, otp, id) => {
    await Otp.create({
        userId: id,
        phone: phone.phone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const saveKRSAIdOTP = async (krsaId, otp, id) => {
    await Otp.create({
        userId: id,
        krsaId: krsaId.krsaId,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const checkPhoneOTP = async (phone) => {
    const record = await Otp.findOne({ phone });
    return record;
}
const isExist = async (userData) =>{
    const isUser = await BaseAuth.findById(userData.userId);
    return isUser;
}
const generateOtp = async (userData) => {
    // 🔢 Generate 6 digit OTP
    const otp = generateRandomNumber(6);
    // Delete old OTP for this user
    await Otp.deleteMany({ userId: userData._id });
    const otpDoc = await new Otp({
        userId: userData._id,   // ✅ changed from identifier
        otp: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }).save();
    return otp; // optional (for SMS sending)
};

const checkOtp = async (userData) => {
    // console.log(userData, "data")
    const { userId, otp } = userData;
    let otpDoc;

    otpDoc = await Otp.findOne({
        userId,
        otp,
        expiresAt: { $gt: new Date() }
    });
    // console.log(otpDoc, "otpDoc")
    if (!otpDoc) {
        throw new Error("Invalid or expired OTP");
    }
    await Otp.deleteMany({ userId });

    return true;
};

const afterLoginSketerFormRepositorie = async (data) => {
  const {
    phone,
    fullName,
    address,
    district,
    gender,
    rsfiId,
    dob,
    aadharNumber,
    category,
    discipline,
    club,
    parent,
    bloodGroup,
    school,
    grade,
    signature,
    photo,
    documents
  } = data;

  console.log(data, "data");

  // 🔍 Check if already exists (by phone OR krsaId)
  let existingUser = await Skater.findOne({ phone });

  if (existingUser) {
    // ✅ UPDATE
    const updatedUser = await Skater.findByIdAndUpdate(
      existingUser._id,
      {
        fullName,
        address,
        district,
        gender,
        rsfiId,
        dob,
        aadharNumber,
        category,
        discipline,
        club,
        parent,
        bloodGroup,
        school,
        grade,
        signature,
        photo,
        ...(documents && { $push: { documents: { $each: documents } } })
      },
      { new: true }
    );

    return {
      type: "updated",
      data: updatedUser
    };
  }

  // ✅ CREATE
  const newUser = await Skater.create({
    phone,
    fullName,
    address,
    district,
    gender,
    rsfiId,
    dob,
    aadharNumber,
    category,
    discipline,
    club,
    parent,
    bloodGroup,
    school,
    grade,
    signature,
    photo,
    documents
  });

  return {
    type: "created",
    data: newUser
  };
};

const saveFirebaseToken = async (userData) => {
    const { userId, firebaseToken } = userData;
    if (!firebaseToken) return; // if not provided, skip

    await BaseAuth.findByIdAndUpdate(
        userId,
        {
            $addToSet: { firebaseTokens: firebaseToken }
        },
        { new: true }
    );
}

const removeFirebaseTokenAndRefressToken = async (userData) => {
    const { userId, firebaseToken } = userData;
    if (!firebaseToken) return; // if not provided, skip    
    await BaseAuth.findByIdAndUpdate(
        userId,
        {
            $pull: { firebaseTokens: firebaseToken }
        },
        { new: true }
    );
}

const deleteAccount = async (userId) => {
    await BaseAuth.findByIdAndDelete(userId);
}

const getUserProfile = async (userId) => {
    const user = await BaseAuth.findById(userId).select("-firebaseTokens -__v -refreshTokens -createdAt -updatedAt");
    return user;
}

const GetDigitalIDCardDetaisl = async (userData) => {
    const user = await BaseAuth.findById(userData._id).select("fullName phone countryCode photo email district dob");
    return user;
}

const toggleNotification = async (userData) => {
    const user = await BaseAuth.findById(userData._id);
    if (!user) {
        throw new Error("User not found");
    }
    // toggle value
    user.isNotificationsEnabled = !user.isNotificationsEnabled;
    await user.save();
    return user.isNotificationsEnabled;
};

const getSupportContact = async (userData) => {
    return {
        email: "support@krsa.com",
        phone: "+91-9876543210"
    }
}

export {
    registerUser,
    isExistEmail,
    isExistPhone,
    isExistKSRAId,
    isExist,
    removeOldEmailOtp,
    removeOldPhoneOtp,
    removeOldKRSAIdOtp,
    saveEmailOtp,
    savePhoneOTP,
    saveKRSAIdOTP,
    checkEmailOTP,
    checkPhoneOTP,
    generateOtp,
    checkOtp,
    afterLoginSketerFormRepositorie,
    saveFirebaseToken,
    removeFirebaseTokenAndRefressToken,
    deleteAccount,
    getUserProfile,
    GetDigitalIDCardDetaisl,
    toggleNotification,
    getSupportContact,
}