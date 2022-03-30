/* eslint-disable import/no-extraneous-dependencies */
const path = require('path'),
    fs = require('fs-extra'),
    chalk = require('chalk'),
    chokidar = require('chokidar'),
    webpack = require('webpack'),
    webpackMessages = require('@lcooper/webpack-messages').default,
    overlayConfig = require('../webpack.config.overlay'),
    config = require('../webpack.config');

const distPath = path.resolve(__dirname, '../dist');

process.env.NODE_ENV = 'production';

function compile(webpackConfig) {
    const { output: { filename } } = webpackConfig;
    return new Promise((resolve, reject) => {
        webpack(webpackConfig).run((err, stats) => {
            if (err) {
                // log error
                console.log(chalk`{bold.red Failed to compile} {cyan ${filename}}\n`);
                console.log(err.message || err);
                // reject promise
                reject(err);
                return;
            }
            // format webpack error / warning messages
            const { errors, warnings } = webpackMessages(stats);
            // check for errors
            if (errors.length) {
                // log errors
                console.log(chalk`{bold.red Failed to compile.} {cyan ${filename}}\n${errors.join('')}`);
                // reject promise
                reject(new Error(`Failed to compile '${filename}'`));
                return;
            }
            // check for warnings
            if (warnings.length) {
                // log warnings
                console.log(chalk`{cyan ${filename}} {bold.yellow compiled with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}}`);
                console.log(warnings.join(''));
            } else {
                console.log(chalk`{cyan ${filename}} {bold.green compiled successfully}`);
            }
            // resolve promise
            resolve(stats);
        });
    });
}

async function build() {
    console.log(chalk`📦  {bold building dev-overlay}`);
    // compile overlay
    let overlayStats;
    try {
        overlayStats = await compile(overlayConfig);
    } catch (e) {
        return;
    }
    // get emitted overlay files
    const { assets } = overlayStats.toJson({ all: false, assets: true }),
        emittedFiles = assets.map(({ name }) => name);

    // compile client entry
    try {
        await compile(config);
    } catch (e) {
        return;
    }

    // clean up output directory
    console.log('🧹  cleaning up output directory...');
    // remove emitted overlay files
    emittedFiles.forEach((file) => {
        try {
            fs.unlinkSync(path.resolve(distPath, file));
            console.log(chalk`{cyan ${file}} {magenta removed}`);
        } catch (e) {
            console.log(chalk`{cyan ${file}} {bold.red failed to remove}`);
        }
    });
    console.log(chalk`🎉  {bold build complete}`);
}

function watch() {
    const watcher = chokidar.watch('./src', {
        ignoreInitial: true,
    });

    watcher
        .on('change', (file) => {
            console.log(chalk`\n{bold.yellow changed} file {cyan ${file}}, rebuilding...\n`);
            build();
        })
        .on('add', (file) => {
            console.log(chalk`\n{bold.green added} file {cyan ${file}}, rebuilding...\n`);
            build();
        })
        .on('unlink', (file) => {
            console.log(chalk`\n{bold.red removed} file {cyan ${file}}, rebuilding...\n`);
            build();
        })
        .once('ready', () => {
            build();
        })
        .on('error', (error) => {
            console.error(chalk`{bold.red Watcher failure}\n\n${error.message || error}`);
            process.exit(1);
        });

    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });
}

// check for watch flag (-watch / -w)
if (/^-{1,2}w(?:atch)?$/.test(process.argv[2])) {
    watch();
} else {
    build();
}