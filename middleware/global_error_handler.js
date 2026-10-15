const errorHandler = (err, req, res, next) => {
    let status = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'Malformed JSON in request body';
    } else if (err.name === 'ValidationError') {
        status = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    } else if (err.name === 'CastError') {
        status = 400;
        message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {
        status = 409;
        message = 'A record with that value already exists';
    }

    if (status >= 500) {
        console.error(err);
        message = 'Internal Server Error'; // don't leak internals to clients
    }

    res.status(status).json({ message });
};

module.exports = errorHandler;
