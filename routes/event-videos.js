const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const Video = require("../models/Video");

const router = express.Router();

// Private directory for video uploads (NOT publicly served)
// Adjust this path to your VPS location
const PRIVATE_DIR = process.env.PRIVATE_UPLOADS_DIR || path.join(__dirname, "..", "..", "private_uploads", "event-videos");

// Ensure directory exists
(async () => {
  try {
    await fs.mkdir(PRIVATE_DIR, { recursive: true });
    console.log(`Private uploads directory ready: ${PRIVATE_DIR}`);
  } catch (err) {
    console.error("Error creating private uploads directory:", err);
  }
})();

// Configure multer for private disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PRIVATE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/mov"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type. Allowed: MP4, MOV, WebM, M4V"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 400 * 1024 * 1024 }, // 400MB max
});

// Public upload endpoint (anyone can upload)
router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const { eventName, uploaderName, uploaderEmail } = req.body;
    
    if (!eventName) {
      return res.status(400).json({ ok: false, error: "eventName is required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "video file is required" });
    }

    const doc = await Video.create({
      eventName,
      uploaderName,
      uploaderEmail,
      originalName: req.file.originalname,
      filename: req.file.filename,
      diskPath: req.file.path, // full private path
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: "pending",
    });

    res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;

