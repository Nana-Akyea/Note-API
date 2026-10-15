const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: 200
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
            trim: true
        },
        category: {
            type: String,
            trim: true,
            default: 'General'
        },
        tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

// Text index for ?search= / ?q= (title matches rank higher than content)
noteSchema.index({ title: 'text', content: 'text' }, { weights: { title: 3, content: 1 } });

module.exports = mongoose.model('Note', noteSchema);
