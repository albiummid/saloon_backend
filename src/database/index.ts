import fs from 'fs';
import mongoose from "mongoose";
import os from 'os';
import path from 'path';
import { serverENV } from "../env-config";
import { seedDatabase } from "./seeder";

export const connectDB = async () => {
	const username = serverENV.DATABASE_USERNAME
	const password = serverENV.DATABASE_PASSWORD
	const instanceId = serverENV.DATABASE_INSTANCE_ID
	const region = serverENV.DATABASE_REGION

	const connectionString = `mongodb+srv://${username}:${password}@${instanceId}.mgdb.${region}.scw.cloud`;

	// Set up TLS options
	const connectOptions: mongoose.ConnectOptions = {
		retryWrites: true,
		tls: true, // Enable TLS/SSL
	};

	let tempCertPath: string | null = null;

	// Check if certificate content is provided as env var
	if (serverENV.MONGODB_CA_CERT) {
		try {
			// Create a temporary file for the certificate
			tempCertPath = path.join(os.tmpdir(), `mongodb-cert-${Date.now()}.pem`);
			const certContent = Buffer.from(serverENV.MONGODB_CA_CERT, 'base64').toString();
			fs.writeFileSync(tempCertPath, certContent);
			connectOptions.tlsCAFile = tempCertPath;
			console.log("Using certificate from environment variable");
		} catch (error) {
			console.error("Failed to create temporary certificate file:", error);
			// Fallback to file-based certificate if available
			const tlsCertificatePath = path.resolve(__dirname, '../../mongodb.pem');
			if (fs.existsSync(tlsCertificatePath)) {
				connectOptions.tlsCAFile = tlsCertificatePath;
				console.log("Falling back to certificate file");
			} else {
				console.error("No valid certificate available");
			}
		}
	} else {
		// Use file-based certificate
		const tlsCertificatePath = path.resolve(__dirname, '../../mongodb.pem');
		if (fs.existsSync(tlsCertificatePath)) {
			connectOptions.tlsCAFile = tlsCertificatePath;
			console.log("Using certificate file");
		} else {
			console.error("Certificate file not found:", tlsCertificatePath);
		}
	}

	let connection;

	try {
		connection = await mongoose.connect(connectionString, connectOptions);

		console.log("⚡ DB Connected");

		try {
			await seedDatabase();
			console.log("⚡ Database seeded successfully");
		} catch (seedError) {
			console.error("❌ Failed to seed database:", seedError);
		}
	} catch (connectionError) {
		console.error("🔥 DB Connection error:", connectionError);
	} finally {
		// Clean up temporary certificate file if it was created
		if (tempCertPath && fs.existsSync(tempCertPath)) {
			try {
				fs.unlinkSync(tempCertPath);
			} catch (error) {
				console.error("Failed to remove temporary certificate file:", error);
			}
		}
	}
	return connection
};

export const disconnectDB = async () => {
	return mongoose
		.connection
		.close()
		.then(() => { console.info("successfully disconnect from the database") })
		.catch((err) => { console.error("Fail to disconnect from the database: ", err) })
}


function flattenObject(
	obj: Record<string, any>,
	prefix: string = ""
): Record<string, any> {
	let result: Record<string, any> = {};
	for (let key in obj) {
		if (obj.hasOwnProperty(key)) {
			let newKey = prefix ? `${prefix}.${key}` : key;
			if (
				typeof obj[key] === "object" &&
				obj[key] !== null &&
				!Array.isArray(obj[key])
			) {
				Object.assign(result, flattenObject(obj[key], newKey));
			} else {
				result[newKey] = obj[key];
			}
		}
	}
	return result;
}

export const updateObject = (obj: Record<string, any>) => {
	$set: flattenObject(obj);
};

