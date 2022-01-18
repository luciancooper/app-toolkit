const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk');

function checkFile(filePath) {
    try {
        fs.accessSync(filePath, fs.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = (appPath, { pages, ts, tsConfig }) => {
    // ensure tsconfig exists if it was specified
    if (ts) {
        if (!checkFile(tsConfig)) {
            throw new Error(`Specified tsconfig {yllow ${path.relative(appPath, tsConfig)}} does not exist`);
        }
    }
    // find files that do not exist
    const notFound = [
        ...new Set(pages.flatMap(({ entry, html }) => [entry, html])),
    ].filter((file) => !checkFile(file));
    // check for unfound files
    if (notFound.length) {
        // throw error with message
        throw new Error([
            chalk.bold(`Could not find the following required file${notFound.length > 1 ? 's' : ''}:`),
            ...notFound.map((file) => (
                chalk`  {dim ${appPath + path.sep}}{cyan ${path.relative(appPath, file)}}`
            )),
        ].join('\n'));
    }
    return true;
};