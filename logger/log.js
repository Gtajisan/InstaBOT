const logger = require('./index.js');

/**
 * Enhanced formatAndLog function to handle various argument styles
 * @param {string} level The log level (info, success, warn, error, debug)
 * @param {Array} args The arguments passed to the log function
 */
function formatAndLog(level, args) {
    let tag = '';
    let message = '';
    let meta = {};

    if (args.length === 1) {
        message = args[0];
    } else if (args.length >= 2) {
        // If the first argument is a short uppercase string, treat it as a tag
        if (typeof args[0] === 'string' && (args[0] === args[0].toUpperCase() || args[0].length < 15)) {
            tag = args[0];
            message = args[1];
            if (args.length > 2) {
                meta = typeof args[2] === 'object' && !Array.isArray(args[2]) ? args[2] : { details: args.slice(2) };
            }
        } else {
            message = args[0];
            meta = typeof args[1] === 'object' && !Array.isArray(args[1]) ? args[1] : { details: args.slice(1) };
        }
    }

    logger.log({
        level,
        tag,
        message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message),
        ...meta
    });
}

module.exports = {
    err: (...args) => formatAndLog('error', args),
    error: (...args) => formatAndLog('error', args),
    warn: (...args) => formatAndLog('warn', args),
    info: (...args) => formatAndLog('info', args),
    succes: (...args) => formatAndLog('success', args),
    success: (...args) => formatAndLog('success', args),
    debug: (...args) => formatAndLog('debug', args),
    master: (...args) => formatAndLog('info', ['MASTER', ...args]),
    dev: (...args) => {
        // Log dev messages if NODE_ENV is development or if specifically enabled in config
        if (process.env.NODE_ENV === 'development') formatAndLog('debug', ['DEV', ...args]);
    }
};
