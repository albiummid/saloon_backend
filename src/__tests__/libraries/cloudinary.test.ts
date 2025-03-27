import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { serverConfigs, serverENV } from '../../env-config';
import { destroyImage, removeFile, uploadImage } from '../../libraries/cloudinary';

// Ensure we have the proper configuration for Cloudinary
describe('Cloudinary Integration Tests', () => {
	// Sample test image path
	const testImageDir = path.resolve(__dirname, '../../../temp');
	const testImagePath = path.resolve(testImageDir, 'test-image.png');
	let testImagePublicId: string;

	// Setup before tests
	beforeAll(() => {
		// Validate Cloudinary config
		expect(serverENV.CLOUDINARY_CLOUD_NAME).toBeDefined();
		expect(serverENV.CLOUDINARY_API_KEY).toBeDefined();
		expect(serverENV.CLOUDINARY_API_SECRET).toBeDefined();

		// Create temp directory if it doesn't exist
		if (!fs.existsSync(testImageDir)) {
			fs.mkdirSync(testImageDir, { recursive: true });
		}

		// Create a simple test image (1x1 pixel black PNG)
		const imageData = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
			'base64'
		);
		fs.writeFileSync(testImagePath, imageData);
	});

	// Clean up after tests
	afterAll(async () => {
		// Clean up test image
		if (fs.existsSync(testImagePath)) {
			fs.unlinkSync(testImagePath);
		}

		// Try to remove the test image from Cloudinary if we have a public ID
		if (testImagePublicId) {
			try {
				await destroyImage(testImagePublicId);
			} catch (error) {
				console.log('Error cleaning up test image from Cloudinary:', error);
			}
		}

		// Remove temp directory if it exists and is empty
		if (fs.existsSync(testImageDir)) {
			const files = fs.readdirSync(testImageDir);
			if (files.length === 0) {
				fs.rmdirSync(testImageDir);
			}
		}
	});

	// Test Cloudinary configuration
	test('should have valid Cloudinary configuration', () => {
		expect(cloudinary.config().cloud_name).toBe(serverENV.CLOUDINARY_CLOUD_NAME);
		expect(cloudinary.config().api_key).toBe(serverENV.CLOUDINARY_API_KEY);
		expect(cloudinary.config().api_secret).toBe(serverENV.CLOUDINARY_API_SECRET);
	});

	// Test uploading an image
	test('should successfully upload an image to Cloudinary', async () => {
		// Make sure test image exists
		expect(fs.existsSync(testImagePath)).toBe(true);

		// Upload image
		const uploadResult = await uploadImage(testImagePath, 'TestFolder');

		// Save public ID for cleanup
		testImagePublicId = uploadResult.public_id;

		// Assert upload was successful
		expect(uploadResult).toBeDefined();
		expect(uploadResult.public_id).toBeDefined();
		expect(uploadResult.secure_url).toBeDefined();
		expect(uploadResult.secure_url).toContain('https://');

		// Check that public_id contains the folder structure
		expect(uploadResult.public_id).toContain(`TestFolder-${serverConfigs.app.name}/`);

		// Verify local file was removed
		expect(fs.existsSync(testImagePath)).toBe(false);
	});

	// Test destroying an image
	test('should successfully destroy an image from Cloudinary', async () => {
		// Skip if no public ID (in case previous test failed)
		if (!testImagePublicId) {
			console.log('Skipping destroy test as no public ID is available');
			return;
		}

		// Destroy image
		const result = await destroyImage(testImagePublicId);

		// Assert destroy was successful
		expect(result).toBeDefined();
		expect(result.result).toBe('ok');
	});

	// Test file removal utility
	test('should handle file removal correctly', () => {
		// Re-create test file for this test
		fs.writeFileSync(testImagePath, 'test content');
		expect(fs.existsSync(testImagePath)).toBe(true);

		// Test removing an existing file
		removeFile(testImagePath);
		expect(fs.existsSync(testImagePath)).toBe(false);

		// Test removing a non-existent file (should log and not throw)
		const nonExistentPath = path.resolve(testImageDir, 'non-existent.png');
		removeFile(nonExistentPath);
	});
}); 
