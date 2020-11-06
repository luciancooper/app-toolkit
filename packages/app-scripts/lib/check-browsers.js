const browserslist = require('browserslist'),
    chalk = require('chalk');

const defaultConfig = {
    production: [
        '>0.2%',
        'not dead',
        'not op_mini all',
    ],
    development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
    ],
};

module.exports = (appPath) => {
    // check for browserslist config
    const current = browserslist.loadConfig({ path: appPath });
    if (current != null) {
        return current;
    }
    // no browserslist config found, create instructional message
    const message = [
        chalk.bold('Unable to detect target browsers.'),
        chalk`\nAdd a {bold.yellow browserslist} config field to your {yellow package.json} file, for example:\n`,
        JSON.stringify({ browserslist: { ...defaultConfig } }, null, 2)
            .replace(/^[{}]$/gm, '')
            .trim()
            .replace(/^ {2}/gm, '')
            .replace(/"[^"]+"/g, (m) => chalk.yellow(m)),
    ].join('\n');
    // throw error with message
    throw new Error(message);
};