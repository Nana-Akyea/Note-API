const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');
const { register, login } = require('../controllers/auth.controller.js');

const TEST_JWT_SECRET = 'test-only-secret-for-auth-controller-tests';

const setTestJwtConfig = (t) => {
    const originalSecret = process.env.JWT_SECRET_KEY;
    const originalExpiry = process.env.JWT_EXPIRES;
    process.env.JWT_SECRET_KEY = TEST_JWT_SECRET;
    process.env.JWT_EXPIRES = '1h';

    t.after(() => {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET_KEY;
        } else {
            process.env.JWT_SECRET_KEY = originalSecret;
        }
        if (originalExpiry === undefined) {
            delete process.env.JWT_EXPIRES;
        } else {
            process.env.JWT_EXPIRES = originalExpiry;
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

test('registration rejects invalid input before querying the database', async (t) => {
    t.mock.method(User, 'findOne', () => {
        assert.fail('Invalid registration input should not query the database');
    });
    const res = createResponse();
    let nextError;

    await register(
        { body: { name: 'A', email: 'not-an-email', password: 'short' } },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message);
    assert.equal(nextError, undefined);
});

test('registration stores a password hash and returns a signed token', async (t) => {
    setTestJwtConfig(t);
    t.mock.method(User, 'findOne', async () => null);
    const userId = '507f1f77bcf86cd799439011';
    let createdUser;
    t.mock.method(User, 'create', async (userData) => {
        createdUser = userData;
        return { _id: userId, name: userData.name, email: userData.email };
    });
    const res = createResponse();
    let nextError;

    await register(
        {
            body: {
                name: 'Alex Example',
                email: 'alex@example.com',
                password: 'correct-horse-battery'
            }
        },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 201);
    assert.notEqual(createdUser.password, 'correct-horse-battery');
    assert.equal(
        await bcrypt.compare('correct-horse-battery', createdUser.password),
        true
    );
    assert.equal(res.body.user.id, userId);
    assert.equal(res.body.user.email, 'alex@example.com');
    assert.equal(jwt.verify(res.body.token, TEST_JWT_SECRET).id, userId);
});

test('login explicitly selects the password hash and returns a token for valid credentials', async (t) => {
    setTestJwtConfig(t);
    const userId = '507f1f77bcf86cd799439011';
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    let selectedFields;
    t.mock.method(User, 'findOne', (filter) => {
        assert.deepEqual(filter, { email: 'alex@example.com' });
        return {
            select(fields) {
                selectedFields = fields;
                return Promise.resolve({
                    _id: userId,
                    name: 'Alex Example',
                    email: 'alex@example.com',
                    password: passwordHash
                });
            }
        };
    });
    const res = createResponse();
    let nextError;

    await login(
        { body: { email: 'alex@example.com', password: 'correct-horse-battery' } },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(selectedFields, '+password');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.id, userId);
    assert.equal(jwt.verify(res.body.token, TEST_JWT_SECRET).id, userId);
});

test('login rejects incorrect credentials without returning a token', async (t) => {
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    t.mock.method(User, 'findOne', () => ({
        select: () => Promise.resolve({
            _id: '507f1f77bcf86cd799439011',
            name: 'Alex Example',
            email: 'alex@example.com',
            password: passwordHash
        })
    }));
    const res = createResponse();
    let nextError;

    await login(
        { body: { email: 'alex@example.com', password: 'wrong-password' } },
        res,
        (error) => { nextError = error; }
    );

    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { message: 'Invalid credentials' });
});
