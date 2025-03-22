import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import nodemailer from 'nodemailer';
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT?.trim() || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.trim()
  }
});

// Test SMTP connection
async function verifyEmailConfig() {
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER ? '(set)' : '(not set)',
          from: process.env.SMTP_FROM
        }
      });
    }
    return false;
  }
}

// Add detailed logging for email sending
export async function sendWelcomeEmail(email: string, username: string) {
  try {
    console.log(`Attempting to send welcome email to ${email} for user ${username}`);

    await transporter.sendMail({
      from: process.env.SMTP_FROM?.trim() || '"Field Service App" <no-reply@fieldservice.app>',
      to: email,
      subject: "Welcome to Field Service Management",
      html: `
        <h1>Welcome to Field Service Management!</h1>
        <p>Hello ${username},</p>
        <p>Your account has been created successfully. You can now log in using your username or email address.</p>
        <p>If you have any questions, please contact your administrator.</p>
      `
    });
    console.log('Welcome email sent successfully');
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) {
    return false; // Invalid stored password format
  }
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Verify email configuration on startup
  verifyEmailConfig().then(isValid => {
    if (!isValid) {
      console.warn('Email functionality may not work due to invalid SMTP configuration');
    }
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'usernameOrEmail',
      passwordField: 'password'
    }, async (usernameOrEmail, password, done) => {
      try {
        // Try to find user by username or email
        const user = await storage.getUserByUsernameOrEmail(usernameOrEmail);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      // Check for existing username
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).send("Username already exists");
      }

      // Check for existing email if provided
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).send("Email already exists");
        }
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(password),
      });

      // Send welcome email if email is provided
      if (email) {
        await sendWelcomeEmail(email, username);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/update-email", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { email } = req.body;

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).send("Email already exists");
      }

      // Update user's email
      const updatedUser = await storage.updateUserEmail(req.user.id, email);
      if (updatedUser) {
        await sendWelcomeEmail(email, updatedUser.username);
        res.json(updatedUser);
      } else {
        res.status(404).send("User not found");
      }
    } catch (error) {
      res.status(500).send("Failed to update email");
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}