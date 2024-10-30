// // server/index.js
// const express = require("express");
// const admin = require("firebase-admin");
// const cors = require("cors");
// const mongoose = require("mongoose");
// require("dotenv").config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Initialize Firebase Admin
// try {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//     }),
//   });
// } catch (error) {
//   console.error("Firebase initialization error:", error);
// }

// // Middleware
// app.use(cors());
// app.use(express.json());

// // MongoDB Device Schema
// const deviceSchema = new mongoose.Schema({
//   code: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   fcmToken: {
//     type: String,
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//     expires: 86400, // Automatically delete after 24 hours
//   },
// });

// const Device = mongoose.model("Device", deviceSchema);

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((err) => console.error("MongoDB connection error:", err));

// // Routes
// app.get("/", (req, res) => {
//   res.json({ message: "Notification Server is running" });
// });

// app.post("/api/register-device", async (req, res) => {
//   try {
//     const { code, fcmToken } = req.body;

//     if (!code || code.length !== 6 || !fcmToken) {
//       return res.status(400).json({ error: "Invalid input" });
//     }

//     const device = await Device.findOneAndUpdate(
//       { code },
//       { code, fcmToken },
//       { upsert: true, new: true }
//     );

//     console.log("Device registered:", device);
//     res.status(200).json({ message: "Device registered successfully", device });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({ error: "Failed to register device" });
//   }
// });

// app.post("/api/send-notification", async (req, res) => {
//   try {
//     const { targetCode, title, body, senderCode } = req.body;

//     // Input validation
//     if (!targetCode || targetCode.length !== 6) {
//       return res.status(400).json({ error: "Invalid target code" });
//     }
//     if (!title || title.trim().length === 0) {
//       return res.status(400).json({ error: "Title is required" });
//     }
//     if (!body || body.trim().length === 0) {
//       return res.status(400).json({ error: "Message body is required" });
//     }

//     const device = await Device.findOne({ code: targetCode });
//     if (!device) {
//       return res.status(404).json({ error: "Device not found" });
//     }

//     const message = {
//       token: device.fcmToken,
//       notification: {
//         title,
//         body,
//       },
//       data: {
//         senderCode: senderCode || "unknown",
//         timestamp: new Date().toISOString(),
//       },
//     };

//     // console.log("Sending notification:", message);
//     const response = await admin.messaging().send(message);
//     // console.log("Notification sent successfully:", response);

//     res.status(200).json({ message: "Notification sent successfully" });
//   } catch (error) {
//     console.error("Notification error:", error);
//     res.status(500).json({ error: "Failed to send notification" });
//   }
// });

// // Development endpoints for testing
// app.get("/api/devices", async (req, res) => {
//   try {
//     const devices = await Device.find({});
//     res.json(devices);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch devices" });
//   }
// });

// app.delete("/api/devices/:code", async (req, res) => {
//   try {
//     await Device.deleteOne({ code: req.params.code });
//     res.json({ message: "Device deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to delete device" });
//   }
// });

// // Start server
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });