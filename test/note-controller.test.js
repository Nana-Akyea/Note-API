const assert = require('node:assert/strict');
const test = require('node:test');
const Note = require('../models/note.model.js');
const {
    createNote,
    getNote,
    updateNote,
    deleteNote
} = require('../controllers/note.controller.js');

const createResponse = () => ({
    statusCode: 200,
    body: undefined,
    status(statusCode) {
        this.statusCode = statusCode;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

test('create-note controller assigns ownership from the authenticated user', async (t) => {
    const ownerId = 'user-123';
    const note = { _id: 'note-123', title: 'Meeting', owner: ownerId };
    let createdData;
    t.mock.method(Note, 'create', async (data) => {
        createdData = data;
        return note;
    });
    const res = createResponse();
    let nextError;

    await createNote(
        {
            user: { id: ownerId },
            body: { title: 'Meeting', content: 'Agenda', owner: 'other-user' }
        },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(createdData.owner, ownerId);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.note, note);
});

test('get-note controller scopes lookup by note ID and authenticated owner', async (t) => {
    const ownerId = 'user-123';
    const noteId = 'note-123';
    const note = { _id: noteId, owner: ownerId };
    t.mock.method(Note, 'findOne', async (filter) => {
        assert.deepEqual(filter, { _id: noteId, owner: ownerId });
        return note;
    });
    const res = createResponse();
    let nextError;

    await getNote(
        { user: { id: ownerId }, params: { id: noteId } },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.note, note);
});

test('update-note controller scopes updates by note ID and authenticated owner', async (t) => {
    const ownerId = 'user-123';
    const noteId = 'note-123';
    const updates = { title: 'Updated title' };
    const note = { _id: noteId, owner: ownerId, ...updates };
    t.mock.method(Note, 'findOneAndUpdate', async (filter, update, options) => {
        assert.deepEqual(filter, { _id: noteId, owner: ownerId });
        assert.deepEqual(update, updates);
        assert.deepEqual(options, { returnDocument: 'after', runValidators: true });
        return note;
    });
    const res = createResponse();
    let nextError;

    await updateNote(
        { user: { id: ownerId }, params: { id: noteId }, body: updates },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.note, note);
});

test('delete-note controller scopes deletion by note ID and authenticated owner', async (t) => {
    const ownerId = 'user-123';
    const noteId = 'note-123';
    const note = { _id: noteId, owner: ownerId };
    t.mock.method(Note, 'findOneAndDelete', async (filter) => {
        assert.deepEqual(filter, { _id: noteId, owner: ownerId });
        return note;
    });
    const res = createResponse();
    let nextError;

    await deleteNote(
        { user: { id: ownerId }, params: { id: noteId } },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { message: 'Note deleted successfully' });
});

test('note controller returns not found for a note outside the authenticated owner scope', async (t) => {
    t.mock.method(Note, 'findOne', async () => null);
    const res = createResponse();

    await getNote(
        { user: { id: 'user-123' }, params: { id: 'note-owned-by-someone-else' } },
        res,
        assert.fail
    );

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'Note not found' });
});
