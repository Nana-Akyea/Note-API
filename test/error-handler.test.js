const assert = require('node:assert/strict');
const test = require('node:test');
const errorHandler = require('../middleware/global_error_handler.js');

const runErrorHandler = (error) => {
    const result = {};
    const res = {
        status(statusCode) {
            result.statusCode = statusCode;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };

    errorHandler(error, {}, res, () => {});
    return result;
};

test('error handler reports malformed JSON as a 400 response', () => {
    assert.deepEqual(
        runErrorHandler({ type: 'entity.parse.failed', status: 400 }),
        {
            statusCode: 400,
            body: { message: 'Malformed JSON in request body' }
        }
    );
});

test('error handler reports Mongoose validation errors as 400', () => {
    assert.deepEqual(
        runErrorHandler({
            name: 'ValidationError',
            errors: {
                title: { message: 'Title is required' },
                content: { message: 'Content is required' }
            }
        }),
        {
            statusCode: 400,
            body: { message: 'Title is required, Content is required' }
        }
    );
});

test('error handler reports Mongoose cast errors as 400', () => {
    assert.deepEqual(
        runErrorHandler({ name: 'CastError', path: '_id', message: 'Cast failed' }),
        {
            statusCode: 400,
            body: { message: 'Invalid value for _id' }
        }
    );
});

test('error handler reports duplicate-key errors as 409', () => {
    assert.deepEqual(
        runErrorHandler({ code: 11000, message: 'Duplicate key details' }),
        {
            statusCode: 409,
            body: { message: 'A record with that value already exists' }
        }
    );
});

test('error handler hides unexpected server error details from clients', (t) => {
    const log = t.mock.method(console, 'error', () => {});
    const result = runErrorHandler({
        status: 500,
        message: 'database connection string must not be exposed'
    });

    assert.equal(result.statusCode, 500);
    assert.deepEqual(result.body, { message: 'Internal Server Error' });
    assert.equal(log.mock.callCount(), 1);
});
