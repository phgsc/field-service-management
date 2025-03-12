import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be set");
}

// Validate MongoDB URI format
const uri = process.env.MONGODB_URI;
if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
  throw new Error("Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://");
}

// Connect to MongoDB with better error handling
mongoose.connect(uri).then(() => {
  console.log('Successfully connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

// User Schema with extended profile information
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  profile: {
    name: { type: String },
    designation: { type: String },
    lastPasswordReset: { type: Date }
  }
});

// Location Schema
const locationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Visit Schema
const visitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  notes: String
});

export const User = mongoose.model('User', userSchema);
export const Location = mongoose.model('Location', locationSchema);
export const Visit = mongoose.model('Visit', visitSchema);