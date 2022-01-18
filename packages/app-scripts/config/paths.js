const path = require('path'),
    fs = require('fs');

const root = fs.realpathSync(process.cwd());

module.exports = {
    root,
    nodeModules: path.resolve(root, './node_modules'),
    configPath: path.resolve(root, './app.config.js'),
};