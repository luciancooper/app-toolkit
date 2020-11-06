const extract = require('./lib/extract'),
    format = require('./lib/format');

/**
 * Extract and format webpack error / warning messages
 * @param {Object} stats - webpack stats object
 * @returns {Object} - error & warning messages
 */
module.exports = (stats) => format(extract(stats));

module.exports.extract = extract;
module.exports.format = format;