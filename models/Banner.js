const mongoose = require('mongoose');
/**
 * Banner Schema
 * This schema defines the structure for a banner document in MongoDB.
 * It includes fields for title, position, thumbnail, publicId, description, and timestamps.
 */

const BannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    position: { type: Number, required: true },
    thumbnail: { type: String, required: true },
    publicId: { type: String, required: true },
    link: { type: String },
    description: { type: String },
    isPublished: { type: Boolean, default: false },
    // Add other fields as needed
  },
  { timestamps: true }
);

// Add a compound index for 'title' and 'thumbnail' fields
BannerSchema.index({ title: 1, description: 1 });

BannerSchema.index({ title: 'text', description: 'text' });

// Create the model
const Banner = mongoose.models.Banner || mongoose.model('Banner', BannerSchema);

module.exports = Banner;