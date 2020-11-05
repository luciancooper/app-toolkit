const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk');

module.exports = (appPath, files) => {
    const notFound = files.filter((file) => {
        try {
            fs.accessSync(file, fs.F_OK);
            return false;
        } catch (err) {
            return true;
        }
    });
    // check for no unfound files
    if (!notFound.length) return true;
    // create error message
    const message = [
        chalk.bold(`Could not find the following required file${notFound.length > 1 ? 's' : ''}:`),
        ...notFound.map((file) => (
            chalk`  {dim ${appPath + path.sep}}{cyan ${path.relative(appPath, file)}}`
        )),
    ].join('\n');
    // throw error with message
    throw new Error(message);
};