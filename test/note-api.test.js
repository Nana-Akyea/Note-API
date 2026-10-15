const assert = require('node:assert/strict');
const test = require('node:test');
const {
    validateCreateNote,
    validateUpdateNote
} = require('../middleware/validateNote.js');
const User = require('../models/user.model.js');
const buildNoteListQuery = require('../utils/noteQuery.js');

const runValidator = (validator, body) => {
    const result = {};
    const req = { body };
    const res = {
        status(status) {
            result.status = status;
            return this;
        },
        json(payload) {
            result.payload = payload;
            return this;
        }
    };

    validator(req, res, () => {
        result.nextCalled = true;
    });

    return { req, result };
};

test('create-note validation accepts required fields and normalizes optional fields', () => {
    const { req, result } = runValidator(validateCreateNote, {
        title: '  Meeting notes  ',
        content: '  Discuss milestones.  ',
        category: '  Work  ',
        tags: [' Planning ']
    });

    assert.equal(result.nextCalled, true);
    assert.deepEqual(req.body, {
        title: 'Meeting notes',
        content: 'Discuss milestones.',
        category: 'Work',
        tags: ['Planning']
    });
});

test('create-note validation rejects missing or blank required fields', () => {
    for (const body of [
        { title: 'Only a title' },
        { title: '   ', content: 'Some content' }
    ]) {
        const { result } = runValidator(validateCreateNote, body);
        assert.equal(result.status, 400);
        assert.equal(result.nextCalled, undefined);
        assert.equal(result.payload.message, 'Validation failed');
    }
});

test('update-note validation requires at least one allowed field', () => {
    const empty = runValidator(validateUpdateNote, {});
    assert.equal(empty.result.status, 400);

    const unknown = runValidator(validateUpdateNote, {
        owner: 'attacker-controlled'
    });
    assert.equal(unknown.result.status, 400);
});

test('user password hashes are excluded from queries by default', () => {
    assert.equal(User.schema.path('password').options.select, false);
});

test('note query builder applies owner scope and default pagination and sorting', () => {
    assert.deepEqual(buildNoteListQuery({}, 'user-123'), {
        page: 1,
        limit: 10,
        filter: { owner: 'user-123' },
        sort: { createdAt: -1, _id: 1 },
        skip: 0
    });
});

test('note query builder combines search, category, tag, pagination, and sorting', () => {
    const result = buildNoteListQuery({
        page: '2',
        limit: '5',
        sort: '-updatedAt',
        q: 'project milestone',
        category: 'Work.(Q)',
        tag: 'Planning'
    }, 'user-123');

    assert.equal(result.page, 2);
    assert.equal(result.limit, 5);
    assert.equal(result.skip, 5);
    assert.deepEqual(result.sort, { updatedAt: -1, _id: 1 });
    assert.equal(result.filter.owner, 'user-123');
    assert.deepEqual(result.filter.$text, { $search: 'project milestone' });
    assert.equal(result.filter.category.test('work.(q)'), true);
    assert.equal(result.filter.category.test('workXQ'), false);
    assert.equal(result.filter.tags, 'planning');
});

test('note query builder accepts ascending sort fields and caps the page size', () => {
    const result = buildNoteListQuery({
        limit: '500',
        sort: 'title',
        search: 'notes'
    }, 'user-123');

    assert.equal(result.page, 1);
    assert.equal(result.limit, 100);
    assert.equal(result.skip, 0);
    assert.deepEqual(result.sort, { title: 1, _id: 1 });
    assert.deepEqual(result.filter.$text, { $search: 'notes' });
});

test('note query builder rejects malformed and non-positive pagination values', () => {
    for (const [name, value] of [
        ['page', '2abc'],
        ['page', '0'],
        ['page', '-1'],
        ['page', '1.5'],
        ['limit', '2abc'],
        ['limit', '0'],
        ['limit', '-1'],
        ['limit', '']
    ]) {
        assert.throws(
            () => buildNoteListQuery({ [name]: value }, 'user-123'),
            (error) => error.status === 400 && error.message.includes(`"${name}"`)
        );
    }
});

test('note query builder rejects pages whose calculated offset is unsafe', () => {
    assert.throws(
        () => buildNoteListQuery({ page: '9007199254740991' }, 'user-123'),
        (error) => error.status === 400 && error.message.includes('page is too large')
    );
});

test('note query builder rejects unsupported sort fields with HTTP 400 status', () => {
    assert.throws(
        () => buildNoteListQuery({ sort: 'password' }, 'user-123'),
        (error) => error.status === 400 && error.message.includes('Invalid sort field')
    );
});
