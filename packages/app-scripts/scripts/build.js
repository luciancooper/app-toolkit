const fs = require('fs-extra'),
    chalk = require('chalk'),
    webpack = require('webpack'),
    checkRequiredFiles = require('../lib/utils/check-required-files'),
    checkBrowsers = require('../lib/utils/check-browsers'),
    errorFormatter = require('../lib/format-errors'),
    paths = require('../config/paths'),
    configFactory = require('../config/webpack.config');

const [, , mode = 'production'] = process.argv;

console.log(chalk`📦  {bold Building app in {blue ${mode}} mode}\n`);

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
fs.emptyDirSync(paths.dist);

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
        console.log(chalk.bold.red('Failed to compile.'));
        // log errors and exit
        const errors = errorFormatter.extract(stats, 'errors');
        console.log(errorFormatter.format(errors, 'error').join(''));
        process.exit(1);
    }
    // check for warnings
    if (stats.hasWarnings()) {
        console.log(chalk.bold.yellow('Compiled with warnings.'));
        // log warnings
        const warnings = errorFormatter.extract(stats, 'warnings');
        console.log(errorFormatter.format(warnings, 'warning').join(''));
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