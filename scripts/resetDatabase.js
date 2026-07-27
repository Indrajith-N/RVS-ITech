require('dotenv').config();
const mongoose = require('mongoose');

const resetDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`Cleared collection: ${collection.collectionName}`);
    }

    console.log('Database fully cleared.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err.message);
    process.exit(1);
  }
};

resetDatabase();