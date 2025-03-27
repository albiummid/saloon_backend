import { th } from '@faker-js/faker/.';
import { connectDB, disconnectDB } from '../../database';
import { seedDatabase } from '../../database/seeder';

describe('Database Module Tests', () => {
	const originalConsoleLog = console.log;
	let consoleOutput: string[] = [];


	afterEach(async () => {
		await expect(disconnectDB()).resolves.toBeUndefined();
	})

	// Global setup
	beforeAll(async () => {
		// Arrange: Setup console.log mock
		console.log = jest.fn((...args) => {
			const message = args.map(arg =>
				typeof arg === 'object' ? JSON.stringify(arg) : arg
			).join(' ');
			consoleOutput.push(message);
			originalConsoleLog(...args);
		});


	});

	describe('Database Connection', () => {

		test('should log success message when connection is successful', async () => {
			// // Arrange: Setup mock to resolve immediately
			// mongooseConnectSpy.mockResolvedValueOnce(mongoose);

			// Act: Connect to the database
			await connectDB();

			// Assert: Verify success message was logged
			expect(consoleOutput).toContain('⚡ DB Connected');
		});

		test('should be able to store a schema', async () => {

			let mongoose = await connectDB()
			expect(mongoose).not.toBeUndefined()
			expect(mongoose?.connection?.readyState).not.toBeUndefined()
			expect(mongoose?.connection?.readyState).toBe(1)

			if (!mongoose) return

			const exampleSchema = new mongoose.Schema({
				name: String,
				age: Number,
			});

			const ExampleModel = mongoose.model('Example', exampleSchema);

			const exampleDoc = new ExampleModel({ name: 'John Doe', age: 30 });

			await exampleDoc.save()
				.then(doc => {
					console.log('Document saved:', doc);
					expect(doc.name).toBe('John Doe');
					expect(doc.age).toBe(30);
				})
				.catch(err => {
					console.error('Error saving document', err);
					expect(err).toBeUndefined()
				});

		})
	});
});

describe("Seeding", () => {
	it("the datbase is well seeded", async () => {
		let mongoose = await connectDB()
		expect(mongoose).not.toBeUndefined()
		expect(mongoose?.connection?.readyState).not.toBeUndefined()
		expect(mongoose?.connection?.readyState).toBe(1)
		if (!mongoose) return
		await seedDatabase().then(() => { console.log("Seed completed") }).catch(err => expect(err).toBeUndefined())

	})

})
