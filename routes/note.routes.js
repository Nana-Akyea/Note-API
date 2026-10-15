const router = require('express').Router();
const auth = require('../middleware/auth.js');
const { validateCreateNote, validateUpdateNote } = require('../middleware/validateNote.js');
const {
    createNote,
    getNotes,
    getNote,
    updateNote,
    deleteNote
} = require('../controllers/note.controller.js');

const validateId = (req, res, next) =>
    /^[a-f\d]{24}$/i.test(req.params.id)
        ? next()
        : res.status(400).json({ message: 'Invalid note ID' });

router.use(auth);

router.post('/', validateCreateNote, createNote);
router.get('/', getNotes);
router.get('/:id', validateId, getNote);
router.put('/:id', validateId, validateUpdateNote, updateNote);
router.delete('/:id', validateId, deleteNote);

module.exports = router;
