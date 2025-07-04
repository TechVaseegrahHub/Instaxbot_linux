const mongoose = require('mongoose');

const connectWithRetry = async () => {
  const mongoURI = "mongodb+srv://techvaseegrah:sangari4321*@cluster0.cv0v1.mongodb.net/?retryWrites=true&w=majority&appName=chatbot_messaging_testing_server";
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 1000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

const connectDB = async () => {
  try {
    // Initial connection
    await connectWithRetry();

    // Handle disconnection events
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected! Attempting to reconnect...');
      connectWithRetry();
    });

    // Handle connection errors
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      mongoose.disconnect();
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB disconnection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Fatal MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;