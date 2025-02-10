import { model, Schema } from "mongoose";
import { generateRandomNumber } from "../../utils/utils";
const modelName = "User";

// Insert table fields here
const fields = {
    name: {
        type: String,
        required: true,
    },
    uid: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    avatar: {
        publicId: {
            type: String,
            default: "",
        },
        secureURL: {
            type: String,
            default: "",
        },
    },
    password: {
        type: String,
        default: null,
        select: false,
    },
    userType: {
        type: String,
        required: true,
        enum: ["Client", "Provider"],
    },
    OTP: {
        type: String,
        default: "",
        select: false,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
};

const User = model(
    modelName,
    new Schema(fields, {
        timestamps: true,
    })
);
// Exporting model

export async function generateUniqueUID(name: string) {
    let uid = name.split(" ").join("-").toLowerCase();
    let isExist = await User.findOne({ uid });
    if (isExist) {
        uid = await generateUniqueUID(uid + generateRandomNumber(1));
    }
    return uid;
}

export default User;
