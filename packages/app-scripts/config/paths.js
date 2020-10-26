const path = require('path'),
    fs = require('fs');

const appPath = fs.realpathSync(process.cwd());

// resolve file paths in the same order as webpack
function resolveModule(file) {
    const extension = ['mjs', 'js', 'jsx'].find((ext) => (
        fs.existsSync(path.resolve(appPath, `${file}.${ext}`))
    )) || 'js';
    return path.resolve(appPath, `${file}.${extension}`);
}

module.exports = {
    root: appPath,
    src: path.resolve(appPath, 'src'),
    dist: path.resolve(appPath, 'dist'),
    entry: resolveModule('src/index'),
    html: path.resolve(appPath, 'src/index.html'),
};