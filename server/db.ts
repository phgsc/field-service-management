import mongoose from 'mongoose';

// Try to use MONGODB_URI if provided, otherwise use local MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/field-service-db';

// Validate MongoDB URI format
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

// Enhanced Visit Schema
const visitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: String, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['not_started', 'in_journey', 'in_service', 'completed', 'paused_next_day', 'blocked'],
    default: 'not_started'
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  journeyStartTime: { type: Date },
  journeyEndTime: { type: Date },
  serviceStartTime: { type: Date },
  serviceEndTime: { type: Date },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  notes: String,
  blockReason: String,
  blockedSince: { type: Date },
  totalServiceTime: { type: Number }, // in minutes
  totalJourneyTime: { type: Number }  // in minutes
});

export const User = mongoose.model('User', userSchema);
export const Location = mongoose.model('Location', locationSchema);
export const Visit = mongoose.model('Visit', visitSchema);