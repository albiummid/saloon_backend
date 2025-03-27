import { generateUniqueUID } from "../../database/models/User"
import { faker } from '@faker-js/faker';
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { connectDB, disconnectDB } from "../../database";

describe("jwt testing", () => {

	beforeEach(async () => {
		await connectDB();
	})

	afterEach(async () => {
		await disconnectDB();
	})
	describe("genereate generateAccessToken", () => {


		it('generate as a provider', async () => {
			const user_uuid = await generateUniqueUID(faker.person.fullName())
			const res = generateAccessToken({ userId: user_uuid, userType: "Provider" })
		})

		it('generate as a client', async () => {
			const user_uuid = await generateUniqueUID(faker.person.fullName())
			const res = generateAccessToken({ userId: user_uuid, userType: "Client" })
			expect(res).not.toEqual("")

		})
	})

	describe("genereate generateRefreshToken", () => {

		it('generate as a provider', async () => {
			const user_uuid = await generateUniqueUID(faker.person.fullName())
			const res = generateRefreshToken({ userId: user_uuid, userType: "Provider" })
		})

		it('generate as a client', async () => {
			const user_uuid = await generateUniqueUID(faker.person.fullName())
			const res = generateRefreshToken({ userId: user_uuid, userType: "Client" })
			expect(res).not.toEqual("")

		})
	})
})


