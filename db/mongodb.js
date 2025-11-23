const { MongoClient } = require('mongodb');

// Load MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vaultdb';
const DB_NAME = 'vaultdb';
const COLLECTION_NAME = 'records';

let client = null;
let db = null;
let collection = null;

// Initialize MongoDB connection
async function connect() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      collection = db.collection(COLLECTION_NAME);
      console.log('✅ Connected to MongoDB');
    }
    return { client, db, collection };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Read all records from MongoDB
async function readDB() {
  try {
    await connect();
    const records = await collection.find({}).toArray();
    // Remove MongoDB's _id field and return records in same format as file-based storage
    return records.map(record => {
      const { _id, ...recordData } = record;
      return recordData;
    });
  } catch (error) {
    console.error('❌ Error reading from MongoDB:', error.message);
    throw error;
  }
}

// Write records array to MongoDB
async function writeDB(data) {
  try {
    await connect();
    // Clear existing records and insert all new ones
    await collection.deleteMany({});
    if (data.length > 0) {
      await collection.insertMany(data);
    }
  } catch (error) {
    console.error('❌ Error writing to MongoDB:', error.message);
    throw error;
  }
}

// Close MongoDB connection
async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collection = null;
    console.log('MongoDB connection closed');
  }
}

module.exports = { connect, readDB, writeDB, close };

