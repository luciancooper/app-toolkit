/**
 * @file
 * This is a modified version of `source-map/lib/read-wasm.js` that imports `source-map/lib/mappings.wasm`
 * directly as an ArrayBuffer and provides the file directly to `source-map` without having to make
 * a network request. Webpack redirects internal imports of `source-map/lib/read-wasm.js` made by other
 * files in the `source-map/lib` folder to this file. It allows this package to use `source-map@0.7.3`
 * rather than `source-map@0.8.0-beta.0` or an earlier version.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const mappings = require('source-map/lib/mappings.wasm');

module.exports = function readWasm() {
    if (mappings instanceof ArrayBuffer) {
        return Promise.resolve(mappings);
    }
    throw new Error('mappings.wasm has not been provided');
};

module.exports.initialize = () => {
    console.debug('SourceMapConsumer.initialize is a no-op with this modified code');
};