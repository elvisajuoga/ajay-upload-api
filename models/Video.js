const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  uploaderName: { type: String },
  uploaderEmail: { type: String },

  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  diskPath: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },

  status: { type: String, enum: ["pending", "approved"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Video", videoSchema);

