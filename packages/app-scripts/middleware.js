const chalk = require('chalk'),
    middleware = require('@lcooper/dev-server/middleware'),
    checkRequiredFiles = require('./lib/check-required-files'),
    checkBrowsers = require('./lib/check-browsers'),
    paths = require('./config/paths'),
    configFactory = require('./config/webpack.config');

module.exports = (options) => {
    // check that required files exist (error thrown on failure)
    checkRequiredFiles(paths.root, [
        paths.entry,
        paths.html,
    ]);
    // warn if target browsers have not been specified
    try {
        checkBrowsers(paths.root);
    } catch ({ message }) {
        console.log(chalk`{bold.red Warning:} ${message}\n`);
    }
    const config = configFactory('development');
    return middleware(config, options);
};