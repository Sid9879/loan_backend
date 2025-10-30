const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    url: String, // Image access URL (CDN or direct)
    lastUrl: String, // Last known URL (for updates)
    providerId: String, // Image ID from provider like Cloudflare or Cloudinary
    name: String, // Original file name
    alt: String,
    sqlId: Number,
    public: { type: Boolean, default: false },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Image', ImageSchema);
