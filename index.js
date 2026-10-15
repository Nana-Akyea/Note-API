const fs = require('node:fs');
const path = require('node:path');

const standardEnvPath = path.join(__dirname, '.env');
const credentialsEnvPath = path.join(__dirname, 'atlas-credentials.env');
require('dotenv').config({
    path: fs.existsSync(standardEnvPath) ? standardEnvPath : credentialsEnvPath
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/global_error_handler.js');
const logger = require('./middleware/logger.js');
const connectDB = require('./database/connectDB.js');
const noteRoutes = require('./routes/note.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const app = express();
const PORT = process.env.PORT || 3000;

const validateJwtConfig = () => {
    const missingVariables = ['JWT_SECRET_KEY', 'JWT_EXPIRES']
        .filter((name) => !process.env[name]?.trim());

    if (missingVariables.length > 0) {
        throw new Error(
            `Missing required environment variable(s): ${missingVariables.join(', ')}. ` +
            'Add them to the .env file in the Note-API directory.'
        );
    }

    // JWT_EXPIRES must be a timespan like "1d" or "12h"
    if (!/^\d+\s*[a-z]+$/i.test(process.env.JWT_EXPIRES.trim())) {
        throw new Error('JWT_EXPIRES must be a timespan such as "1d" or "12h".');
    }
};

// Render runs behind a proxy; needed so rate limiting sees the real client IP
app.set('trust proxy', 1);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(logger);
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, please try again later.' }
}));

app.get('/', (req, res) => {
    res.json({
        message: 'Notes API is running',
        endpoints: {
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            notes: '/api/notes'
        }
    });
});

app.use('/api/notes', noteRoutes);
app.use('/api/auth', authRoutes);

app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use(errorHandler);

const startServer = async () => {
    validateJwtConfig();
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Project is live on port ${PORT}`);
    });
};

startServer().catch((error) => {
    console.error('Failed to start the server:', error.message);
    process.exitCode = 1;
});