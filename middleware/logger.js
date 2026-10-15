    const logRequest = (req, res, next) => {
        const timestamp = new Date().toString();
        const method = req.method;
        const URL = req.url;
        const IP_address = req.ip;
        console.log(`A ${method} request was received at [${timestamp}]
            from IP Address: ${IP_address}`);
        next();
    };

    module.exports = logRequest;