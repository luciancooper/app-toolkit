const path = require('path'),
    fs = require('fs-extra'),
    chalk = require('chalk'),
    webpack = require('webpack'),
    configFactory = require('../config/webpack.config');

const [, , mode = 'production'] = process.argv;

console.log(chalk`📦  {bold Building app in {blue ${mode}} mode}`);

const appPath = fs.realpathSync(process.cwd()),
    appDist = path.resolve(appPath, 'dist');

// create webpack config
let config;

try {
    config = configFactory(mode);
} catch ({ message }) {
    // log error and exit
    console.log(chalk`{bold.red Error resolving webpack config:}\n\n${message}\n`);
    process.exit(1);
}

// create webpack compiler instance
let compiler;
try {
    compiler = webpack(config);
} catch ({ message }) {
    // log error and exit
    console.log(chalk`{bold.red Error initializing webpack compiler:}\n\n${message}\n`);
    process.exit(1);
}

// clear the output directory
fs.emptyDirSync(appDist);

// run webpack
compiler.run((err, stats) => {
    if (err) {
        let message = err.message || '';
        // Add additional information for postcss errors
        if (Object.hasOwnProperty.call(err, 'postcssNode')) {
            message += `\nCompileError: Begins at CSS selector ${err.postcssNode.selector}`;
        }
        // log error and exit
        console.log(chalk`{bold.red Failed to compile.}\n\n${message}\n`);
        process.exit(1);
    }
    // check for errors
    if (stats.hasErrors()) {
        const { errors } = stats.toJson({ all: false, errors: true });
        // log errors and exit
        console.log(chalk`{bold.red Failed to compile.}\n\n${errors.join('\n\n')}\n`);
        process.exit(1);
    }
    // check for warnings
    if (stats.hasWarnings()) {
        const { warnings } = stats.toJson({ all: false, warnings: true });
        // log warnings
        console.log(chalk`{bold.yellow Compiled with warnings:}\n\n$${warnings.join('\n\n')}\n`);
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
            entrypoints: false,
            performance: false,
        }),
    );
});