const chalk = require('chalk'),
    DevServer = require('@lcooper/dev-server'),
    checkRequiredFiles = require('../lib/check-required-files'),
    checkBrowsers = require('../lib/check-browsers'),
    paths = require('../config/paths'),
    configFactory = require('../config/webpack.config');

console.log(chalk`🚀  {bold Launching dev server...}\n`);

// check that required files exist
try {
    checkRequiredFiles(paths.root, [
        paths.entry,
        paths.html,
    ]);
} catch ({ message }) {
    console.log(chalk`{bold.red Error:} ${message}`);
    process.exit(1);
}

// warn if target browsers have not been specified
try {
    checkBrowsers(paths.root);
} catch ({ message }) {
    console.log(chalk`{bold.red Warning:} ${message}\n`);
}

const port = parseInt(process.env.PORT, 10) || 3000;

// create webpack config
let config;

try {
    config = configFactory('development');
} catch ({ message }) {
    // log error and exit
    console.log(chalk`{bold.red Error resolving webpack config:}\n\n${message}\n`);
    process.exit(1);
}

// create dev server
const devServer = new DevServer(config, {
    interactive: process.stdout.isTTY,
});

// launch the dev server
devServer.listen({ port });

// shutdown gracefully on SIGINT & SIGTERM signals
['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
        devServer.close(() => {
            process.exit(1);
        });
    });
});