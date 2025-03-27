import jwt from "jsonwebtoken";
import { serverENV } from "../env-config";

// Token schema
type TokenSchema = {
	userId: string;
	userType: string;
};

/**
 * Decodes a base64 string to its original format
 */
export function decodeBase64(base64String: string): string {
	return Buffer.from(base64String, 'base64').toString('utf-8');
}

export function signJwt(
	object: Object,
	privateKey: string,
	options?: jwt.SignOptions | undefined
) {
	return jwt.sign(object, privateKey, {
		...(options && options),
		algorithm: "RS256",
	});
}

export function verifyJwt<TokenSchema>(token: string, publicKey: string) {
	try {
		const decoded: any = jwt.verify(token, publicKey);
		return {
			valid: true,
			expired: decoded?.exp < Date.now(),
			decoded: decoded as TokenSchema & {
				iat: number;
				exp: number;
			},
		};
	} catch (e: any) {
		return {
			valid: false,
			expired: e.message === "jwt expired",
			decoded: null,
		};
	}
}

// Access Token
export const generateAccessToken = ({
	userId,
	userType,
}: {
	userId: string;
	userType: "Client" | "Provider";
}) => {
	const accessTokenPrivateKey = decodeBase64(serverENV.ACCESS_TOKEN_PRIVATE_KEY);

	return signJwt(
		{
			userId,
			userType,
		},
		accessTokenPrivateKey,
		{
			expiresIn: serverENV.ACCESS_TOKEN_EXPIRE_IN as any,
		}
	);
};

export const verifyAccessToken = (token: string) => {
	const accessTokenPublicKey = decodeBase64(serverENV.ACCESS_TOKEN_PUBLIC_KEY);
	return verifyJwt<TokenSchema>(token, accessTokenPublicKey);
};

// Refresh token
export const generateRefreshToken = ({ userId, userType }: TokenSchema) => {
	if (serverENV.REFRESH_TOKEN_PRIVATE_KEY === "") {
		console.error("serverENV.REFRESH_TOKEN_PRIVATE_KEY: ", serverENV.REFRESH_TOKEN_PRIVATE_KEY)
		return ""
	}

	const refreshTokenPrivateKey = decodeBase64(serverENV.REFRESH_TOKEN_PRIVATE_KEY);

	return signJwt(
		{
			userId,
			userType,
		},
		refreshTokenPrivateKey,
		{
			expiresIn: serverENV.REFRESH_TOKEN_EXPIRE_IN as any,
		}
	);
};

export const verifyRefreshToken = (token: string) => {
	const refreshTokenPublicKey = decodeBase64(serverENV.REFRESH_TOKEN_PUBLIC_KEY);
	return verifyJwt<TokenSchema>(token, refreshTokenPublicKey);
};
