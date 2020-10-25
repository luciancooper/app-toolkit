const chalk = require('chalk'),
    DevServer = require('../lib/dev-server'),
    configFactory = require('../config/webpack.config');

console.log(chalk`🚀  {bold Launching dev server...}`);

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
devServer.listen(port);

// shutdown gracefully on SIGINT & SIGTERM signals
['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
        devServer.close(() => {
            process.exit(1);
        });
    });
});