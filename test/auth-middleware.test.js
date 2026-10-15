const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth.js');

const TEST_JWT_SECRET = 'test-only-secret-for-auth-middleware-tests';

const setTestJwtSecret = (t) => {
    const originalSecret = process.env.JWT_SECRET_KEY;
    process.env.JWT_SECRET_KEY = TEST_JWT_SECRET;

    t.after(() => {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET_KEY;
        } else {
            process.env.JWT_SECRET_KEY = originalSecret;
        }
    });
};

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

test('auth middleware rejects requests without an authorization token', (t) => {
    setTestJwtSecret(t);
    const res = createResponse();
    let nextCalled = false;

    auth({ headers: {} }, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        message: 'Access denied: no authorization token provided'
    });
    assert.equal(nextCalled, false);
});

test('auth middleware rejects non-Bearer and malformed authorization headers', (t) => {
    setTestJwtSecret(t);
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, TEST_JWT_SECRET);

    for (const authorization of [
        `Basic ${token}`,
        `Bearer ${token} extra`,
        'Bearer'
    ]) {
        const res = createResponse();
        let nextCalled = false;

        auth({ headers: { authorization } }, res, () => {
            nextCalled = true;
        });

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, {
            message: 'Authorization header must use the Bearer scheme'
        });
        assert.equal(nextCalled, false);
    }
});

test('auth middleware rejects invalid bearer tokens', (t) => {
    setTestJwtSecret(t);
    const res = createResponse();
    let nextCalled = false;

    auth({ headers: { authorization: 'Bearer not-a-valid-token' } }, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { message: 'Invalid token' });
    assert.equal(nextCalled, false);
});

test('auth middleware attaches the verified user and continues for valid bearer tokens', (t) => {
    setTestJwtSecret(t);
    const user = { id: '507f1f77bcf86cd799439011' };
    const token = jwt.sign(user, TEST_JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    let nextCalled = false;

    auth(req, res, () => {
        nextCalled = true;
    });

    assert.equal(req.user.id, user.id);
    assert.equal(typeof req.user.iat, 'number');
    assert.equal(nextCalled, true);
    assert.equal(res.body, undefined);
});
