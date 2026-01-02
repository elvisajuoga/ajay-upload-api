const express = require("express");
const fs = require("fs");
const path = require("path");
const FileUpload = require("../models/FileUpload");

const router = express.Router();

// Download endpoint (public)
router.get("/:id/download", async (req, res) => {
  try {
    const fileUpload = await FileUpload.findById(req.params.id);
    if (!fileUpload) return res.status(404).json({ error: "Not found" });

    const filePath = path.join(__dirname, "..", "..", "uploads", fileUpload.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    return res.download(filePath, fileUpload.originalName);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Delete endpoint (public - consider adding protection if needed)
router.delete("/:id", async (req, res) => {
  try {
    const fileUpload = await FileUpload.findById(req.params.id);
    if (!fileUpload) return res.status(404).json({ error: "Not found" });

    // 1) delete the file from disk
    const filePath = path.join(__dirname, "..", "..", "uploads", fileUpload.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 2) delete from DB
    await FileUpload.deleteOne({ _id: fileUpload._id });

    res.json({ ok: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

module.exports = router;

