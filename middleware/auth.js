const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authorization = req.headers.authorization;
        if (typeof authorization !== 'string' || !authorization.trim()) {
            return res.status(401).json({
                message: 'Access denied: no authorization token provided'
            });
        }

        const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);
        if (scheme.toLowerCase() !== 'bearer' || !token || extraParts.length > 0) {
            return res.status(401).json({
                message: 'Authorization header must use the Bearer scheme'
            });
        }

        req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid token'
        });
    }
};

module.exports = auth;