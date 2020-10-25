const fs = require('fs'),
    chalk = require('chalk'),
    checkBrowsers = require('./lib/utils/check-browsers'),
    middleware = require('./lib/dev-middleware'),
    configFactory = require('./config/webpack.config');

const appPath = fs.realpathSync(process.cwd());

module.exports = (options) => {
    // warn if target browsers have not been specified
    try {
        checkBrowsers(appPath);
    } catch ({ message }) {
        console.log(chalk`{bold.red Warning:} ${message}\n`);
    }
    const config = configFactory('development');
    return middleware(config, options);
};