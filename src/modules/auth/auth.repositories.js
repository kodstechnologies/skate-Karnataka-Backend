import mongoose from "mongoose";
import { generateRandomNumber } from "../../util/token/token.js";
import { BaseAuth } from "./baseAuth.model.js";
import { Otp } from "./otp.model.js";
// import { Skater } from "./skater.model.js";
// import { Guest } from "./guest.model.js";
// import { School } from "./school.model.js";
// import { Official } from "./official.model.js";

const registerUser_repositories = async (userData) => {
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
const isExist = async (userData) => {
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


const afterLoginSkaterFormRepositories = async (data, id) => {
    console.log(data, "dddd")
    // update
    const updated = await Skater.findByIdAndUpdate(
        { _id: id, role: "Skater" },
        {
            $set: {
                ...data,
                verify: true
            }
        },
        { new: true, runValidators: true }
    )
        .populate("district")
        .populate("club");

    if (!updated) {
        throw new Error("Skater not found");
    }

};

const afterLoginClubFormRepositories = async (data, id) => {
    console.log(data, "====");
    console.log(id, "ID");

    // ✅ Update
    const updated = await Academy.findByIdAndUpdate(
        { _id: id, role: "academy" },
        {
            $set: {
                ...data,
                verify: true
            }
        },
        {
            new: true,
            runValidators: true,
        }
    );


    if (!updated) {
        throw new Error("Academy not found");
    }

    return updated;
};

const afterLoginGuestFormRepositories = async (data, id) => {
    console.log(data, "====");
    console.log(id, "ID");

    const updated = await Guest.findOneAndUpdate(
        { _id: id, role: "Guest" }, // ✅ correct filtering
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        {
            new: true,
            runValidators: true,
        }
    );
    console.log(updated, "updated")
    if (!updated) {
        throw new Error("Guest not found or role mismatch");
    }

    return updated;
};
const afterLoginParentFormRepositories = async (data, id) => {
    console.log(data, "====");
    console.log(id, "ID");

    // ✅ Update
    const updated = await Academy.findByIdAndUpdate(
        { _id: id, role: "Parent" },
        {
            $set: {
                ...data,
                verify: true
            }
        },
        {
            new: true,
            runValidators: true,
        }
    );


    if (!updated) {
        throw new Error("Academy not found");
    }

    return updated;
}

const afterLoginOfficialFormRepositories = async (data, id) => {
    console.log(data, "====");
    console.log(id, "ID");

    // ✅ Update
    const updated = await Official.findByIdAndUpdate(
        { _id: id, role: "Official" },
        {
            $set: {
                ...data,
                verify: true
            }
        },
        {
            new: true,
            runValidators: true,
        }
    );


    if (!updated) {
        throw new Error("Academy not found");
    }

    return updated;
}
const afterLoginSchoolFormRepositories = async (data, id) => {
    console.log(data, "====");
    console.log(id, "ID");

const updated = await School.findOneAndUpdate(
    { _id: id, role: "school" },  // ✅ correct filter
    {
        $set: {
            ...data,
            verify: true
        }
    },
    {
        returnDocument: "after",
        runValidators: true,
    }
);
    console.log(updated, "updated")
    if (!updated) {
        throw new Error("School not found");
    }

 
};


const saveFirebaseToken = async (userData) => {
    const { userId, firebaseToken, firebaseTokens } = userData;

    const normalizedTokens = [
        firebaseToken,
        ...(Array.isArray(firebaseTokens) ? firebaseTokens : [firebaseTokens]),
    ]
        .filter((token) => typeof token === "string")
        .map((token) => token.trim())
        .filter(Boolean);

    if (!normalizedTokens.length) return;

    await BaseAuth.findByIdAndUpdate(
        userId,
        {
            $addToSet: { firebaseTokens: { $each: normalizedTokens } }
        },
        { new: true }
    );
}

const saveRefreshToken = async (userId, refreshToken) => {
    if (!refreshToken) return;

    await BaseAuth.findByIdAndUpdate(
        userId,
        {
            $addToSet: { refreshTokens: refreshToken }
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
    registerUser_repositories,
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
    afterLoginSkaterFormRepositories,
    afterLoginClubFormRepositories,
    afterLoginGuestFormRepositories,
    afterLoginParentFormRepositories,
    afterLoginOfficialFormRepositories,
    afterLoginSchoolFormRepositories,
    saveFirebaseToken,
    saveRefreshToken,
    removeFirebaseTokenAndRefressToken,
    deleteAccount,
    getUserProfile,
    GetDigitalIDCardDetaisl,
    toggleNotification,
    getSupportContact,
}