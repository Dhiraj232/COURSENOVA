const mongoose = require('mongoose');

const SlideSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    image: { type: String, required: true }, // Saved filename under /uploads/slides/
    link: { type: String, default: '' }, // Target redirection link
    order: { type: Number, default: 0 }, // Ascending display sequence
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Slide', SlideSchema);
