// api/index.js
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Create Express instance
const app = express();

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Device Schema
const deviceSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  fcmToken: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Automatically delete after 24 hours
  },
});

const Device = mongoose.model("Device", deviceSchema);

// MongoDB Connection
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedConnection = connection;
  return connection;
}

// Routes
app.get("/api", (req, res) => {
  res.json({ message: "Notification Server is running" });
});

app.post("/api/register-device", async (req, res) => {
  try {
    await connectToDatabase();
    const { code, fcmToken } = req.body;

    if (!code || code.length !== 6 || !fcmToken) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const device = await Device.findOneAndUpdate(
      { code },
      { code, fcmToken },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Device registered successfully", device });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register device" });
  }
});

app.post("/api/send-notification", async (req, res) => {
  try {
    await connectToDatabase();
    const { targetCode, title, body, senderCode } = req.body;

    if (!targetCode || targetCode.length !== 6) {
      return res.status(400).json({ error: "Invalid target code" });
    }
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: "Message body is required" });
    }

    const device = await Device.findOne({ code: targetCode });
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const message = {
      token: device.fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        senderCode: senderCode || "unknown",
        timestamp: new Date().toISOString(),
      },
    };

    const response = await admin.messaging().send(message);
    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Development endpoints
if (process.env.NODE_ENV === "development") {
  app.get("/api/devices", async (req, res) => {
    try {
      await connectToDatabase();
      const devices = await Device.find({});
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  app.delete("/api/devices/:code", async (req, res) => {
    try {
      await connectToDatabase();
      await Device.deleteOne({ code: req.params.code });
      res.json({ message: "Device deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete device" });
    }
  });
}

// Export the Express API
module.exports = app;
