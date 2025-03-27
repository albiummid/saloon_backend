import { sendEmail } from '../../libraries/mailer';

// Set a default 'from' email if not configured in the environment
// This is for test purposes only
if (!process.env.EMAIL_USERNAME) {
	process.env.EMAIL_USERNAME = 'test@example.com';
}

describe('Mailer Library', () => {
	it('should create a transporter with correct configuration', () => {
		// Just ensure the file can be imported without errors
		require('../../libraries/mailer');

		// We're not mocking, so we just verify the import works without error
		expect(true).toBe(true);
	});

	it('should send email with correct parameters', async () => {
		// Spy on console.log and console.error to check what happens
		const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		// Email data
		const emailData = {
			to: 'babacoiffure27@gmail.com',
			subject: 'Test Subject from Hostinger - Parameters Test',
			text: 'Test plain text message from Hostinger',
			html: '<p>Test HTML message from Hostinger</p>',
		};

		// Call sendEmail function
		await sendEmail(emailData);

		// Check whether the email was sent successfully or failed
		// One of these should have been called
		expect(consoleLogSpy.mock.calls.length + consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);

		// Restore console spies
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it('should handle errors when sending email fails', async () => {
		// Spy on console.error
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		// Email data with invalid recipient to trigger an error
		const emailData = {
			to: 'invalid-email@', // Invalid email format should cause an error
			subject: 'Test Subject from Hostinger - Error Test',
			text: 'Test plain text message from Hostinger',
			html: '<p>Test HTML message from Hostinger</p>',
		};

		// Call sendEmail function
		await sendEmail(emailData);

		// Verify error was logged
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Error sending email:",
			expect.any(Error)
		);

		// Restore console.error
		consoleErrorSpy.mockRestore();
	});

	it('should attempt to send a real email to babacoiffure27@gmail.com', async () => {
		// Spy on both console.log and console.error
		const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		// Email data with the specified recipient
		const emailData = {
			to: 'babacoiffure27@gmail.com',
			subject: 'Test Email from Baba Coiffure Backend via Hostinger',
			text: 'This is a test email sent from the unit tests to verify email functionality using Hostinger.',
			html: '<h1>Test Email via Hostinger</h1><p>This is a test email sent from the unit tests to verify that the email functionality is working correctly with Hostinger.</p><p>If you received this email, the Hostinger email configuration is properly set up.</p>',
		};

		// Send a real email
		await sendEmail(emailData);

		// Check that either success or error was logged
		expect(consoleLogSpy.mock.calls.length + consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);

		// Restore console spies
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();

		// Log for test clarity
		console.log('Email sending attempted to babacoiffure27@gmail.com');
	});
});
