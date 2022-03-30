import type { Options, Middleware } from '@lcooper/dev-server';
import { middleware } from '@lcooper/dev-server';
import { loadAppConfig, createWebpackConfig } from './config';

export default function devMiddleware(options: Options = {}): Middleware {
    const appConfig = loadAppConfig();
    // check for config errors
    if (appConfig.errors.length) {
        // if there are any errors with severity 'error', throw an error
        const errors = appConfig.errors.filter(({ severity }) => severity === 'error');
        if (errors.length) {
            throw new Error(errors.map(({ message }) => message).join('\n'));
        }
        // otherwise, log the warnings
        for (const { message } of appConfig.errors) {
            console.log(message);
        }
    }
    // create webpack config
    const webpackConfig = createWebpackConfig('development', appConfig);
    return middleware(webpackConfig, options);
}