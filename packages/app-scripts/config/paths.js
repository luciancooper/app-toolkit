const path = require('path'),
    fs = require('fs');

const appPath = fs.realpathSync(process.cwd()),
    configPath = path.resolve(appPath, './app.config.js');

// load app.config.js file if it exists
let appConfig = {};

if (fs.existsSync(configPath)) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    appConfig = require(configPath);
}

const {
    entry = 'src/index',
    html = 'src/index.html',
    buildDir = 'dist',
} = appConfig;

// resolve file paths in the same order as webpack
function resolveModule(file) {
    // check if file extension has already been specified
    if (path.extname(file)) return path.resolve(appPath, file);
    // else determine extension
    const extension = ['mjs', 'js', 'jsx'].find((ext) => (
        fs.existsSync(path.resolve(appPath, `${file}.${ext}`))
    )) || 'js';
    return path.resolve(appPath, `${file}.${extension}`);
}

module.exports = {
    root: appPath,
    src: path.resolve(appPath, 'src'),
    dist: path.resolve(appPath, buildDir),
    entry: resolveModule(entry),
    html: path.resolve(appPath, html),
    config: appConfig,
};