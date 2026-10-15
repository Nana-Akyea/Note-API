const Note = require('../models/note.model.js');
const buildNoteListQuery = require('../utils/noteQuery.js');

// POST /api/notes
const createNote = async (req, res, next) => {
    try {
        const note = await Note.create({ ...req.body, owner: req.user.id });
        res.status(201).json({ message: 'Note created successfully', note });
    } catch (error) {
        next(error);
    }
};

// GET /api/notes?page=1&limit=10&sort=-createdAt&search=meeting&category=Work&tag=urgent
const getNotes = async (req, res, next) => {
    try {
        const { page, limit, filter, sort, skip } =
            buildNoteListQuery(req.query, req.user.id);

        const [notes, total] = await Promise.all([
            Note.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Note.countDocuments(filter)
        ]);

        res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            count: notes.length,
            notes
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/notes/:id
const getNote = async (req, res, next) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.status(200).json({ note });
    } catch (error) {
        next(error);
    }
};

// PUT /api/notes/:id
const updateNote = async (req, res, next) => {
    try {
        const note = await Note.findOneAndUpdate(
            { _id: req.params.id, owner: req.user.id },
            req.body,
            { returnDocument: 'after', runValidators: true }
        );
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.status(200).json({ message: 'Note updated successfully', note });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/notes/:id
const deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { createNote, getNotes, getNote, updateNote, deleteNote };
