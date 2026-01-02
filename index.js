const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());

// --------------------
// 0) CORS (needed when frontend is on DreamHost and API is on Render)
// --------------------
function getCorsOrigins() {
  // Comma-separated list, e.g.:
  // CORS_ORIGINS=https://theajayexperience.com,https://www.theajayexperience.com,http://localhost:8080
  const raw = (process.env.CORS_ORIGINS || "").trim();
  if (!raw) return null; // allow all
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = getCorsOrigins();
app.use(
  cors({
    origin: allowedOrigins ? allowedOrigins : true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key"],
  })
);
app.options("*", cors());

// --------------------
// 1) Ensure uploads dir exists (in public directory for web access)
// --------------------
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// --------------------
// 2) Multer storage config
// --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // safer unique filenames
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeOriginal}`);
  },
});

// Single file upload (videos only)
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB (change as needed)
  },
  fileFilter: (req, file, cb) => {
    // accept video only
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed."), false);
    }
    cb(null, true);
  },
});

// Multiple files upload (videos and images, up to 5GB each)
const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 5, // 5GB per file
  },
  fileFilter: (req, file, cb) => {
    // accept video and image files
    if (!file.mimetype.startsWith("video/") && !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only video and image files are allowed."), false);
    }
    cb(null, true);
  },
});

// --------------------
// 3) Simple admin auth (header key)
// --------------------
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --------------------
// 4) Upload endpoint (public - single file)
// --------------------
app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  res.json({
    message: "Upload successful",
    file: {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

// --------------------
// 4b) Multiple files upload endpoint (public)
// --------------------
// Health check route (GET) - for testing
app.get("/api/upload/multiple", (req, res) => {
  res.status(200).json({ 
    message: "Upload route is live. Use POST to upload files.",
    endpoint: "/api/upload/multiple",
    method: "POST",
    maxFiles: 20,
    maxFileSize: "5GB per file",
    acceptedTypes: "video/* and image/*"
  });
});

// Upload endpoint (POST)
app.post("/api/upload/multiple", uploadMultiple.array("files", 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const files = req.files.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    size: f.size,
    mimetype: f.mimetype,
  }));

  res.status(201).json({ 
    message: "Upload successful", 
    files 
  });
});

// --------------------
// 5) Admin: list uploaded videos
// --------------------
app.get("/api/admin/videos", requireAdmin, (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(f => !f.startsWith(".")) // ignore hidden files
    .map(filename => {
      const full = path.join(UPLOAD_DIR, filename);
      const stat = fs.statSync(full);
      return {
        filename,
        size: stat.size,
        uploadedAt: stat.mtime, // last modified time
      };
    })
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  res.json(files);
});

// --------------------
// 6) Admin: download a file
// --------------------
app.get("/api/admin/download/:filename", requireAdmin, (req, res) => {
  const filename = req.params.filename;

  // prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });

  res.download(filePath, filename);
});

// --------------------
// 7) Admin: delete a file (optional)
// --------------------
app.delete("/api/admin/videos/:filename", requireAdmin, (req, res) => {
  const filename = req.params.filename;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });

  fs.unlinkSync(filePath);
  res.json({ message: "Deleted", filename });
});

// --------------------
// 7b) Upload stats endpoint
// --------------------
app.get("/api/upload/stats", (req, res) => {
  // Calculate total size of uploaded files
  let totalUploaded = 0;
  try {
    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(f => !f.startsWith("."));
    
    files.forEach(filename => {
      const full = path.join(UPLOAD_DIR, filename);
      const stat = fs.statSync(full);
      totalUploaded += stat.size;
    });
  } catch (error) {
    console.error("Error calculating upload stats:", error);
  }

  const uploadLimit = 5 * 1024 * 1024 * 1024; // 5GB default limit
  const remaining = Math.max(0, uploadLimit - totalUploaded);

  res.json({
    totalUploaded,
    uploadLimit,
    remaining,
  });
});

// --------------------
// 7c) API Health Check
// --------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      upload: "/api/upload (POST - single file)",
      uploadMultiple: "/api/upload/multiple (POST - multiple files)",
      events: "/api/events (GET)",
      admin: {
        videos: "/api/admin/videos (GET - requires x-admin-key header)",
        download: "/api/admin/download/:filename (GET - requires x-admin-key header)",
        delete: "/api/admin/videos/:filename (DELETE - requires x-admin-key header)"
      }
    }
  });
});

// --------------------
// 8) Events API (for tickets page)
// --------------------
// Simple events endpoint - returns empty array for now
// You can add MongoDB later if needed
app.get("/api/events", (req, res) => {
  res.json([]);
});

// --------------------
// 9) Admin page routes
// --------------------
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin", "admin.html"));
});

app.get("/admin/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin", "admin.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin", "admin.html"));
});

// --------------------
// 10) Upload page routes (removed - Nginx serves /upload/index.html directly)
// --------------------
// Note: Upload page is at /upload/index.html (served by Nginx as static file)
// If you need Express to serve it, uncomment and update path:
// app.get("/uploads", (req, res) => {
//   res.sendFile(path.join(__dirname, "..", "upload", "index.html"));
// });

// --------------------
// 10b) Serve uploaded files (make them downloadable)
// --------------------
// Serve uploaded files at /uploads/<filename>
// This allows direct access to uploaded files via URL
app.use("/uploads", express.static(UPLOAD_DIR));

// --------------------
// 11) Serve your static website (optional local dev)
// --------------------
app.use(express.static(path.join(__dirname, "..")));

// --------------------
// 12) Error handler
// --------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Upload error" });
});

const port = process.env.PORT || 3000;
// For Render: default to 0.0.0.0 (public service). For VPS: set HOST=127.0.0.1 in env.
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
