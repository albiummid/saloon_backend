import mongoose from 'mongoose';
import { connectDB } from './src/database';
import User, { generateUniqueUID } from './src/database/models/User';

async function testDatabaseStorage() {
  try {
    console.log('Starting database test...');
    
    // Connect to the database
    console.log('Attempting to connect to database...');
    await connectDB();
    console.log('Connected to database for testing');

    // Generate test user data
    const testName = 'Test User ' + Math.floor(Math.random() * 1000);
    const testEmail = `testuser${Math.floor(Math.random() * 1000)}@example.com`;
    
    console.log(`Creating test user with name: ${testName}, email: ${testEmail}`);
    
    // Generate a unique UID for the user
    const uid = await generateUniqueUID(testName);
    console.log(`Generated unique UID: ${uid}`);
    
    // Create new user object
    const testUser = new User({
      name: testName,
      uid: uid,
      email: testEmail,
      userType: 'Client',
    });

    console.log('Saving user to database...');
    // Save the user to the database
    const savedUser = await testUser.save();
    console.log('Successfully saved test user to database:');
    console.log(JSON.stringify(savedUser, null, 2));

    console.log('Fetching user from database...');
    // Verify by fetching the user back from the database
    const fetchedUser = await User.findById(savedUser._id);
    console.log('Successfully retrieved user from database:');
    console.log(JSON.stringify(fetchedUser, null, 2));

    console.log('Cleaning up - deleting test user...');
    // Clean up - delete the test user
    await User.findByIdAndDelete(savedUser._id);
    console.log('Test user deleted successfully');

  } catch (error) {
    console.error('Error testing database storage:');
    console.error(error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    console.log('Test completed. Disconnecting from database...');
    // Disconnect from the database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from database');
    } else {
      console.log('No active database connection to disconnect');
    }
  }
}

// Run the test
console.log('Starting database storage test script');
testDatabaseStorage().then(() => {
  console.log('Test script completed');
}).catch(err => {
  console.error('Unhandled error in test script:', err);
}); 