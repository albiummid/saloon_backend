import env from "dotenv";
import * as nodemailer from "nodemailer";
import { serverENV } from "../env-config";

env.config();

const transporter = nodemailer.createTransport({
	host: "smtp.tem.scaleway.com",
	port: 465,
	secure: true, // true for 465, false for other ports
	auth: {
		user: serverENV.EMAIL_USERNAME,
		pass: serverENV.EMAIL_PASSWORD,
	},
	tls: {
		// Do not fail on invalid certs
		rejectUnauthorized: false,
	},
});
export const sendEmail = async ({ to, subject, html, text }: any) => {
	try {
		const info = await transporter.sendMail({
			from: "no-reply@babacoiffure.com",
			to,
			subject,
			text,
			html,
		});
		console.log("Email sent successfully!", info.response);
	} catch (error) {
		console.error("Error sending email:", error);
	}
};
