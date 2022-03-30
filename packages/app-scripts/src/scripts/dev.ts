import chalk from 'chalk';
import { DevServer } from '@lcooper/dev-server';
import { loadAppConfig, createWebpackConfig } from '../config';

export async function run(): Promise<0 | 1> {
    const appConfig = loadAppConfig();
    // check for config errors
    if (appConfig.errors.length) {
        const configError = appConfig.errors.reduce((err, { severity, message }) => {
            console.log(message);
            return err || (severity === 'error');
        }, false);
        if (configError) return 1;
    }

    console.log(chalk`🚀  {bold Launching dev server...}\n`);

    const port = parseInt(process.env['PORT'] ?? '3000', 10),
        // create webpack config
        webpackConfig = createWebpackConfig('development', appConfig),
        // create dev server
        devServer = new DevServer(webpackConfig, {
            interactive: process.stdout.isTTY,
        });

    // launch the dev server
    devServer.listen({ port });

    return new Promise((resolve, reject) => {
        // shutdown gracefully on SIGINT & SIGTERM signals
        ['SIGINT', 'SIGTERM'].forEach((signal) => {
            process.on(signal, () => {
                devServer.close(() => {
                    resolve(1);
                });
            });
        });
    });
}