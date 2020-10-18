const chalk = require('chalk'),
    webpack = require('webpack'),
    DevServer = require('../lib/dev-server'),
    configFactory = require('../config/webpack.config');

console.log(chalk`🚀  {bold Launching dev server...}`);

const port = parseInt(process.env.PORT, 10) || 3000;

// create webpack config
configFactory('development').then(
    (config) => {
        // create webpack compiler instance
        let compiler;
        try {
            compiler = webpack(config);
        } catch ({ message }) {
            // log error and exit
            console.log(chalk`{bold.red Error initializing webpack compiler:}\n\n${message}\n`);
            process.exit(1);
        }

        // create dev server
        const devServer = new DevServer(compiler);

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
    },
    ({ message }) => {
        // log error and exit
        console.log(chalk`{bold.red Error resolving webpack config:}\n\n${message}\n`);
        process.exit(1);
    },
);