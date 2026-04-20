import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
    {
        winnerKRSAId: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            trim: true
        },

        division: {
            type: String,
            trim: true
        },

        certificateID: {
            type: String,
            unique: true,
            index: true
        },

        request: {
            type: Boolean,
            default: false
        },

        clubAllow: {
            type: Boolean,
            default: false
        },

        districtAllow: {
            type: Boolean,
            default: false
        },

        stateAllow: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);


// 🔥 Auto-generate CERT + 4 digit unique ID
certificateSchema.pre("save", async function (next) {
    if (!this.certificateID) {
        let isUnique = false;

        while (!isUnique) {
            const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit
            const certId = `CERT${randomNum}`;

            const existing = await mongoose.models.Certificate.findOne({
                certificateID: certId
            });

            if (!existing) {
                this.certificateID = certId;
                isUnique = true;
            }
        }
    }

});

export const Certificate = mongoose.model("Certificate", certificateSchema);