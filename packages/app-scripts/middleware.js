const chalk = require('chalk'),
    checkRequiredFiles = require('./lib/utils/check-required-files'),
    checkBrowsers = require('./lib/utils/check-browsers'),
    middleware = require('./lib/dev-middleware'),
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