import mongoose from 'mongoose';
import { ServiceStatus, AchievementType } from '@shared/schema';

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
  email: { type: String, sparse: true, unique: true }, // Allow null but must be unique if present
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  profile: {
    name: { type: String },
    designation: { type: String },
    lastPasswordReset: { type: Date },
    emailVerified: { type: Boolean, default: false }
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
    enum: Object.values(ServiceStatus),
    default: ServiceStatus.NOT_STARTED
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

// Add after the existing schemas
const scheduleSchema = new mongoose.Schema({
  engineerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  engineerName: { type: String, required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'journey', 'service', 'admin', 'sales-call', 'sales-visit',
      'research', 'day-off', 'vacation', 'public-holiday',
      'weekly-off', 'in-office'
    ]
  },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  allDay: { type: Boolean, default: false }
});

// System Settings Schema
const systemSettingsSchema = new mongoose.Schema({
  gamificationEnabled: { type: Boolean, default: true },
  lastUpdated: { type: Date, required: true, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

systemSettingsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

systemSettingsSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastUpdated: new Date() });
  next();
});


// Achievement Schema
const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String,
    required: true,
    enum: Object.values(AchievementType)
  },
  earnedAt: { type: Date, required: true },
  metadata: {
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    criteria: String,
    value: Number
  }
});

// Points Schema
const pointsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, required: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' }
});

export const User = mongoose.model('User', userSchema);
export const Location = mongoose.model('Location', locationSchema);
export const Visit = mongoose.model('Visit', visitSchema);
export const Schedule = mongoose.model('Schedule', scheduleSchema);
export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
export const Achievement = mongoose.model('Achievement', achievementSchema);
export const Points = mongoose.model('Points', pointsSchema);