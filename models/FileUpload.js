const mongoose = require("mongoose");

const fileUploadSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    default: 'Anonymous'
  },
  email: String,
  ipAddress: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("FileUpload", fileUploadSchema);

