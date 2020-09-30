/* eslint-disable import/no-extraneous-dependencies */
const path = require('path'),
    fs = require('fs-extra'),
    chalk = require('chalk'),
    chokidar = require('chokidar'),
    webpack = require('webpack'),
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
                return void reject(err);
            }
            // check for errors
            if (stats.hasErrors()) {
                // log errors
                const { errors } = stats.toJson({ all: false, errors: true });
                console.log(chalk`{bold.red Failed to compile} {cyan ${filename}}\n`);
                console.log(errors.join('\n\n'));
                // reject promise
                return void reject(new Error(`Failed to compile '${filename}'`));
            }
            // check for warnings
            if (stats.hasWarnings()) {
                // log warnings
                const { warnings } = stats.toJson({ all: false, warnings: true });
                console.log(chalk`{cyan ${filename}} {bold.yellow compiled with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}}\n`);
                console.log(warnings.join('\n\n'));
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

    // clear the output directory
    fs.emptyDirSync(distPath);

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
    console.log(chalk`🧹  {bold cleaning up output directory...}`);
    // remove emitted overlay files
    emittedFiles.forEach((file) => {
        try {
            fs.unlinkSync(path.resolve(distPath, file));
            console.log(chalk`{bold.magenta removed} {cyan ${file}}`);
        } catch (e) {
            console.log(chalk`{bold.red failed to remove} {cyan ${file}}`);
        }
    });
}

function watch() {
    const watcher = chokidar.watch('./src', {
        ignoreInitial: true,
    });

    watcher
        .on('change', (file) => {
            console.log(chalk`{bold.green added} file {cyan ${file}}, rebuilding...`);
            build();
        })
        .on('add', (file) => {
            console.log(chalk`{bold.yellow changed} file {cyan ${file}}, rebuilding...`);
            build();
        })
        .on('unlink', (file) => {
            console.log(chalk`{bold.red removed} file {cyan ${file}}, rebuilding...`);
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