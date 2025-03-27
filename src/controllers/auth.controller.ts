import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { generateUniqueUID } from "../database/models/User";
import { handleAsyncHttp } from "../middleware/controller";

import { configDotenv } from "dotenv";
import { serverConfigs, serverENV } from "../env-config";
import { destroyImage } from "../libraries/cloudinary";
import { sendEmail } from "../libraries/mailer";
import {
	createProviderExpressAccount,
	getAccountLink,
} from "../libraries/stripe";
import { ErrorHandler } from "../middleware/error";
import { checkHasValidSubscription } from "../service/subscription.service";
import { getUserById } from "../service/user.service";
import {
	generateAccessToken,
	generateRefreshToken,
	verifyRefreshToken,
} from "../utils/jwt";
import { generateOTP } from "../utils/utils";

configDotenv();

export const handleCredentialSignUp = handleAsyncHttp(async (req, res) => {
	const { name, email, userType, password } = req.body;

	if (!name || !email || !userType || !password) {
		console.error("Missing required fields in signup request");
		return res.error("Please provide all required fields");
	}

	try {
		const isExists = await User.findOne({
			email,
			userType,
		});

		if (isExists) {
			if (!isExists.emailVerified) {
				await User.findByIdAndDelete(isExists._id);
				console.log(`Deleted unverified user account: ${isExists._id}`);
			} else {
				console.error(`User already exists with verified email: ${email}`);
				return res.error("Already have a verified account.");
			}
		}

		const user = await User.create({
			name,
			email,
			password: await bcrypt.hash(password, 10),
			userType,
			providerSettings: userType === "Provider" ? {
				appointmentMode: "Pre-deposit",
			} : undefined,
			uid: await generateUniqueUID(name),
		});

		const OTP = generateOTP(5);

		const mailOptions = {
			to: email,
			subject: "Email verification OTP",
			html: `<div>
				<p>Your <b>${serverConfigs.app.name}</b> Email verification OTP is</p>
				<br>
				<h1>${OTP}</h1>
				</div>`,
		};

		try {
			await sendEmail(mailOptions);
		} catch (error) {
			console.error("Failed to send verification email:", error);
			await User.findByIdAndDelete(user._id);
			return res.error("Failed to send verification email. Please try again.");
		}

		user.OTP = OTP;
		await user.save();

		return res.success(
			"User signup successful!\nWe send a mail with OTP to verify your mail. Please verify your mail before logging in."
		);

	} catch (error) {
		console.error("Error during user signup:", error);
		return res.error("Failed to create user account");
	}
});

export const handleCredentialSignIn = handleAsyncHttp(async (req, res) => {
	const { email, password, userType } = req.body;
	const user = await User.findOne({ email, userType }).select([
		"+password",
		"+otp",
	]);
	if (!user) {
		return res.error("Your email/password is incorrect", 400);
	}

	if (!user.emailVerified) {
		return res.error("Please verify your mail first!", 400);
	}

	const isValid = await bcrypt.compare(password, user.password);

	if (!isValid) {
		return res.error("email/password incorrect", 400);
	}

	const _accessToken = generateAccessToken({
		userId: user._id.toString(),
		userType: user.userType.toString() as "Client" | "Provider",
	});
	const _refreshToken = generateRefreshToken({
		userId: user._id.toString(),
		userType: user.userType.toString(),
	});
	res.default.cookie("accessToken", _accessToken, {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.default.cookie("refreshToken", _refreshToken, {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.success("Login successful", await User.findById(user._id), 200);
});

export const handleChangeEmailRequest = handleAsyncHttp(async (req, res) => {
	const { newEmail } = req.body;
	const user = await getUserById(req.headers.userId as string);
	const OTP = generateOTP(5);

	const mailOptions = {
		to: newEmail,
		subject: "Email verification OTP",
		html: `<div>
        <p>Your <b>${serverConfigs.app.name}</b> email changing OTP is</p>
        <br>
        <h1>${OTP}</h1>
        </div>`,
	};
	await sendEmail(mailOptions);
	user.OTP = OTP;
	await user.save();
	res.success(
		"An OTP sent to your new email. Verify your new email with that OTP"
	);
});
export const handleCheckAuth = handleAsyncHttp(async (req, res) => {
	const user = await User.findById(req.headers?.userId);
	const data: any = {
		isAuthValid: Boolean(req.headers?.userId),
		userId: req.headers?.userId,
		user,
		userType: req.headers?.userType,
		accessToken: req.cookies["accessToken"],
		refreshToken: req.cookies["refreshToken"],
	};
	if (user?.userType === "Provider") {
		data.subscription = user?._id
			? await checkHasValidSubscription(user?._id.toString())
			: null;
	}
	res.success("Auth details", data);
});
export const handleChangeEmailRequestVerify = handleAsyncHttp(
	async (req, res) => {
		const { OTP, newEmail } = req.body;
		const user = await User.findById(req.headers.userId as string).select(
			"+OTP"
		);
		if (!user) {
			throw new ErrorHandler("User not found", 404);
		}
		if (!user.OTP == OTP) {
			return res.error("Wrong OTP", 400);
		}
		user.email = newEmail;
		user.OTP = "";
		await user.save();
		res.success("Your email address changed");
	}
);

export const handleVerifyEmailWithOTP = handleAsyncHttp(async (req, res) => {
	const { OTP, email, userType } = req.body;

	if (!OTP) {
		console.error("Missing OTP")
	}

	if (!email) {
		console.error("Missing email")
	}

	if (!userType) {
		console.error("Missing userType")
	}

	const user = await User.findOne({
		email,
		userType,
	}).select("+OTP");

	if (!user) {
		return res.error("User not identified by this email and userType", 404);
	}
	if (!user.OTP == OTP) {
		return res.error("Wrong OTP", 400);
	}
	user.emailVerified = true;
	user.OTP = "";
	await user.save();


	const _accessToken = generateAccessToken({
		userId: user._id.toString(),
		userType: user.userType.toString() as "Client" | "Provider"

	});
	const _refreshToken = generateRefreshToken({
		userId: user._id.toString(),
		userType: user.userType.toString(),
	});
	res.default.cookie("accessToken", _accessToken, {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.default.cookie("refreshToken", _refreshToken, {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});

	if (user.userType === "Provider" && user.providerSettings) {
		const providerStripeAccount = await createProviderExpressAccount(
			user.email
		);
		user.providerSettings.stripeAccountId = providerStripeAccount.id;
		await user.save();

		const generateAccountLink = await getAccountLink(
			providerStripeAccount.id
		);

		const mailOptions = {
			to: email,
			subject: `Stripe account for payment in <b>${serverConfigs.app.name}</b>`,
			html: `<div>
            <p>As a professional at <b>${serverConfigs.app.name}</b> . We have created an account on stripe to transfer your funds. Please clink on this given "Continue with Stripe" button or bellow link</p>
            <br>
            <button>
            <a href="${generateAccountLink.url}"></a>
            </button>
            <br/>
            <a>
            ${generateAccountLink.url}
            </a>
            </div>`,
		};
		await sendEmail(mailOptions);
		return res.success(
			"You are Logged in. A stripe account is created for you to transfer funds. Please continue with that link."
		);
	}

	res.success(
		"OTP matched for email verification. You are logged in with verified email.",
		null,
		200
	);
});

export const handleReissueToken = handleAsyncHttp(async (req, res) => {
	const { refreshToken } = req.cookies;
	if (!refreshToken) {
		throw new ErrorHandler("Unauthorized request", 401);
	}
	const { valid, decoded } = verifyRefreshToken(refreshToken);
	if (!valid || !decoded?.userType || !decoded.userId) {
		throw new ErrorHandler("Token expired or invalid refresh token", 403);
	}
	const _accessToken = generateAccessToken({
		userId: decoded.userId.toString(),
		userType: decoded.userType.toString() as "Provider" | "Client",
	});
	const _refreshToken = generateRefreshToken({
		userId: decoded.userId.toString(),
		userType: decoded.userType.toString(),
	});
	res.default.cookie("accessToken", _accessToken, {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.default.cookie("refreshToken", _refreshToken, {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.success("Token reissued", {
		refreshToken: _refreshToken,
		accessToken: _accessToken,
	});
});

export const handleSignOut = handleAsyncHttp(async (req, res) => {
	res.default.clearCookie("accessToken", {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.default.clearCookie("refreshToken", {
		httpOnly: true,
		secure: serverENV.NODE_ENV === "production",
		sameSite: "strict",
	});
	res.success("You are signout.");
});

// Handle Password reset
export const handleForgotPassword = handleAsyncHttp(async (req, res) => {
	const { email, userType } = req.body;

	// Check if the user exists
	const user = await User.findOne({ email, userType });
	if (!user) {
		throw new ErrorHandler("User  with this email does not exist.", 400);
	}

	const OTP = generateOTP(5);

	const mailOptions = {
		to: email,
		subject: "Password Reset OTP",
		// text: `Click the link to reset your password: http://localhost:${serverENV.PORT}/api/v1/reset-password/${token}.\nThis token is valid for next 1 hour.`,
		html: `<div>
        <p>Your <b>${serverConfigs.app.name}</b> password resetting OTP is</p>
        <br>
        <h1>${OTP}</h1>
        </div>`,
	};
	await sendEmail(mailOptions);
	user.OTP = OTP;
	await user.save();
	res.success("Password resetting OTP sent in your mail.", null, 200);
});

export const handleVerifyOTP = handleAsyncHttp(async (req, res) => {
	const { OTP, userType, email } = req.body;
	const user = await User.findOne({ email, userType }).select("+OTP");

	console.log(user?.OTP, OTP);
	if (!user) {
		throw new ErrorHandler("No user found!", 400);
	}
	if (user.OTP !== OTP) {
		throw new ErrorHandler("Wrong OTP", 400);
	}
	user.OTP = "";
	await user.save();
	res.success(
		"OTP verified!",
		{
			token: jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET!, {
				expiresIn: "1h",
			}),
		},
		200
	);
});

export const handleResetPassword = handleAsyncHttp(async (req, res) => {
	const { token, password } = req.body;
	const decode: any = jwt.verify(token, process.env.TOKEN_SECRET!);
	if (!decode.userId) {
		throw new Error("Invalid token, userId not found.");
	}
	const user = await User.findById(decode.userId).select("+password");
	if (!user) {
		throw new Error("User not found.");
	}
	user.password = await bcrypt.hash(password, 10);
	await user.save();
	res.success("Password reset successful", null, 200);
});

export const handleChangePassword = handleAsyncHttp(async (req, res) => {
	const { oldPassword, newPassword } = req.body;

	const user = await User.findById(req.headers.userId).select("+password");
	if (!user) {
		return res.error("User not found");
	}
	const isMatched = bcrypt.compareSync(oldPassword, user?.password);
	if (!isMatched) {
		return res.error("Incorrect old password");
	}
	await User.findByIdAndUpdate(user._id, {
		password: await bcrypt.hash(newPassword, 10),
	});

	res.success("Password changed", null, 200);
});

export const handleDeleteAccount = handleAsyncHttp(async (req, res) => {
	const { password } = req.body;
	const user = await User.findById(req.headers.userId as string).select(
		"+password"
	);
	if (!user) {
		return res.error("User not found", 400);
	}
	if (!(await bcrypt.compare(password, user.password))) {
		return res.error("Password not matched");
	}

	if (user.avatar?.publicId) {
		await destroyImage(user.avatar?.publicId);
	}

	await User.findByIdAndDelete(req.headers.userId);
	res.success("Password changed", null, 200);
});
