const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, maxlength: 100 },
        email: { type: String, required: true, maxlength: 254 },
        message: { type: String, required: true, maxlength: 2000 },
    },
    { timestamps: true }
);

contactSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
