const mongoose = require('mongoose');

const pdfJobSchema = new mongoose.Schema({
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true }, // 'preview-pdf' or 'import-pdf'
    status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing', index: true },
    progress: { type: Number, default: 0 },
    uploadProgress: { type: Number, default: 0 },
    ocrProgress: { type: Number, default: 0 },
    aiProgress: { type: Number, default: 0 },
    validationProgress: { type: Number, default: 0 },
    importProgress: { type: Number, default: 0 },
    estimatedTime: { type: String, default: null },
    warningsCount: { type: Number, default: 0 },
    errorsCount: { type: Number, default: 0 },
    validationErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    stage: { type: String, default: 'Queueing' },
    logs: { type: [String], default: [] },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    totalQuestions: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete jobs after 24 hours
});

module.exports = mongoose.model('PdfJob', pdfJobSchema);
