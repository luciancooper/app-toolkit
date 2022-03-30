import fs from 'fs-extra';
import chalk from 'chalk';
import webpack from 'webpack';
import type { Configuration, Compiler, Stats } from 'webpack';
import webpackMessages from '@lcooper/webpack-messages';
import { loadAppConfig, createWebpackConfig } from '../config';

export async function run(mode: 'development' | 'production' = 'production'): Promise<0 | 1> {
    const appConfig = loadAppConfig();
    // check for config errors
    if (appConfig.errors.length) {
        const configError = appConfig.errors.reduce((err, { severity, message }) => {
            console.log(message);
            return err || (severity === 'error');
        }, false);
        if (configError) return 1;
    }
    console.log(chalk`📦  {bold Building app in {blue ${mode}} mode}\n`);

    // create webpack config
    let webpackConfig: Configuration;
    try {
        webpackConfig = createWebpackConfig(mode, appConfig);
    } catch ({ message }) {
        // log error and exit
        console.log(chalk`{bold.red Error resolving webpack config:}\n\n${message}\n`);
        return 1;
    }
    // create webpack compiler instance
    let compiler: Compiler;
    try {
        compiler = webpack(webpackConfig);
    } catch ({ message }) {
        // log error and exit
        console.log(chalk`{bold.red Error initializing webpack compiler:}\n\n${message}\n`);
        return 1;
    }

    // clear the output directory
    fs.emptyDirSync(appConfig.output);

    // run the compiler
    return new Promise<Stats>((resolve, reject) => {
        // run webpack
        compiler.run((err, stats) => {
            if (err) reject(err);
            else resolve(stats!);
        });
    }).then<0 | 1>((stats) => {
        // format webpack error / warning messages
        const { errors, warnings } = webpackMessages(stats);
        // check for errors
        if (errors.length) {
            // log errors and exit
            console.log(chalk`{bold.red Failed to compile.}\n${errors.join('')}`);
            return 1;
        }
        // check for warnings
        if (warnings.length) {
            // log warnings
            console.log(chalk`{bold.yellow Compiled with warnings.}\n${warnings.join('')}`);
        } else {
            console.log(chalk.bold.green('Compiled successfully.'));
        }
        // log assets
        console.log(
            stats.toString({
                colors: true,
                assetsSort: 'name',
                cachedAssets: false,
                warnings: false,
                modules: false,
                children: false,
                chunks: false,
                chunkModules: false,
                entrypoints: true,
                performance: false,
            }),
        );
        return 0;
    }).catch((error: Error) => {
        let { message = '' } = error;
        // Add additional information for postcss errors
        if (Object.hasOwnProperty.call(error, 'postcssNode')) {
            const { postcssNode: { selector } } = (error as unknown as { postcssNode: { selector: string } });
            message += `\nCompileError: Begins at CSS selector ${selector}`;
        }
        // log error and exit
        console.log(chalk`{bold.red Failed to compile.}\n\n${message}\n`);
        return 1;
    });
}