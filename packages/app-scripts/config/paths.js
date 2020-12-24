const path = require('path'),
    fs = require('fs');

const root = fs.realpathSync(process.cwd()),
    configPath = path.resolve(root, './app.config.js');

module.exports = { root, configPath };