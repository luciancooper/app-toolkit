const path = require('path'),
    fs = require('fs');

const appPath = fs.realpathSync(process.cwd());

module.exports = {
    root: appPath,
    src: path.resolve(appPath, 'src'),
    dist: path.resolve(appPath, 'dist'),
    config: path.resolve(appPath, './app.config.js'),
};