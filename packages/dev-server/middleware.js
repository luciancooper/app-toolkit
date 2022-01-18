/**
 * @file
 * development middleware inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

const express = require('express'),
    chalk = require('chalk'),
    webpack = require('webpack'),
    webpackDevMiddleware = require('webpack-dev-middleware'),
    ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin'),
    webpackMessages = require('@lcooper/webpack-messages'),
    clearConsole = require('./lib/clear-console'),
    prependEntry = require('./lib/prepend-entry');

function addCompilationResults(latest, stats, usingTypescript) {
    const info = {
        // get compilation hash
        hash: stats.hash,
        // calculate compilation time
        time: stats.endTime - stats.startTime,
        // get compilation name
        name: stats.name || (stats.compilation && stats.compilation.name) || '',
        // extract errors & warnings
        ...webpackMessages.extract(stats),
    };
    return (latest.hash && latest.hash !== info.hash) ? {
        ...info,
        compiling: false,
        awaitingTypeCheck: usingTypescript,
    } : {
        ...latest,
        ...info,
        compiling: false,
    };
}

function addTypescriptResults(latest, issues, compilation) {
    if (latest.hash && latest.hash !== compilation.hash) {
        throw new Error('TypeScript results out of sync with compilation');
    }
    return {
        ...latest,
        hash: compilation.hash,
        tsc: {
            errors: issues.filter(({ severity }) => severity === 'error').map(webpackMessages.tsError),
            warnings: issues.filter(({ severity }) => severity === 'warning').map(webpackMessages.tsError),
        },
        awaitingTypeCheck: false,
    };
}

function publish(responses, payload) {
    // stringify the payload data
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    // write the payload data to each response
    responses.forEach((res) => {
        res.write(data);
    });
}

module.exports = (config, {
    interactive = false,
    path = '/__dev-server',
    heartbeat = 10 * 1000,
} = {}) => {
    // inject client entries into the config
    config.entry = prependEntry(config.entry, [
        `${require.resolve('./client/entry')}?path=${path}&timeout=${heartbeat * 2}`,
        require.resolve('webpack/hot/dev-server'),
    ]);
    // inject development plugins into the config
    config.plugins = config.plugins || [];
    // inject HotModuleReplacementPlugin into the config if it doesnt already exist
    if (!config.plugins.some((plugin) => plugin.constructor.name === 'HotModuleReplacementPlugin')) {
        config.plugins.push(
            new webpack.HotModuleReplacementPlugin(),
        );
    }

    // inject eslint-formatter into eslint-webpack-plugin if present
    const eslintPlugin = config.plugins.find((plugin) => plugin.constructor.name === 'ESLintWebpackPlugin');
    if (eslintPlugin) {
        eslintPlugin.options.formatter = require.resolve('@lcooper/webpack-messages/eslint-formatter');
    }
    // inject stylelint-formatter into stylelint-webpack-plugin if present
    const stylelintPlugin = config.plugins.find((plugin) => plugin.constructor.name === 'StylelintWebpackPlugin');
    if (stylelintPlugin) {
        // eslint-disable-next-line @lcooper/global-require
        stylelintPlugin.options.formatter = require('@lcooper/webpack-messages/stylelint-formatter');
    }
    // check if using typescript
    const usingTypescript = config.plugins.some((plugin) => plugin.constructor.name === 'ForkTsCheckerWebpackPlugin');
    // create webpack compiler instance
    let compiler;
    try {
        compiler = webpack(config);
    } catch ({ message }) {
        // log error and exit
        console.log(chalk`{bold.red Error initializing webpack compiler:}\n\n${message}\n`);
        process.exit(1);
    }

    // instantiate webpack-dev-middleware
    const middleware = webpackDevMiddleware(compiler, {
            publicPath: config.output.publicPath,
        }),
        // create express router
        router = express.Router();

    // add webpack-dev-middleware to router
    router.use(middleware);

    // create responses cache
    let responses = [];
    // set interval
    const interval = setInterval(() => {
        responses.forEach((res) => {
            res.write('data: \uD83D\uDC93\n\n');
        });
    }, heartbeat).unref();

    // set latest results object
    let latest = { hash: null, compiling: true, awaitingTypeCheck: usingTypescript },
        // can't remove compiler hooks, so we just set a flag and noop if closed
        closed = false;

    if (usingTypescript) {
        // set up fork-ts-checker-webpack-plugin hooks
        const hooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);

        // add hook to log message about waiting for ts results
        hooks.waiting.tap('dev-server', (compilation) => {
            console.log(chalk.cyan('Files successfully emitted, waiting for TypeScript results...'));
        });

        // issues hook fires when type check is complete
        hooks.issues.tap('dev-server', (issues, compilation) => {
            // check if server has been closed
            if (closed) return [];
            // augment latest stats object with ts issue results
            let updated;
            try {
                updated = addTypescriptResults(latest, issues, compilation);
            } catch (error) {
                console.log(chalk`{red [ERROR]} ${error.message}`);
                return [];
            }
            // store updated stats object so they can be propagated to new clients
            latest = updated;
            // format extracted typescript errors / warnings
            const { errors, warnings } = webpackMessages.format(updated.tsc);
            if (errors.length) {
                console.log(chalk`{bold.red ${errors.length} TypeScript error(s):}\n${errors.join('')}`);
            } else if (warnings.length) {
                console.log(chalk`{bold.yellow ${warnings.length} TypeScript warning(s):}\n${warnings.join('')}`);
            } else {
                console.log(chalk.bold.green('TypeScript check passed'));
            }
            // publish updated object that include type check results
            publish(responses, { action: 'typescript', ...updated });
            return issues;
        });
    }

    // 'invalid' event fires when you have changed a file, and webpack is recompiling a bundle.
    compiler.hooks.invalid.tap('dev-server', () => {
        // check if server has been closed
        if (closed) return;
        // clear console if in iteractive mode
        if (interactive) clearConsole();
        // clear latest results object
        latest = { hash: null, compiling: true, awaitingTypeCheck: usingTypescript };
        // write message to console
        console.log('Compiling...');
        // publish 'invalid' event
        publish(responses, { action: 'invalid', ...latest });
    });

    // 'done' event fires when webpack has finished recompiling the bundle.
    compiler.hooks.done.tap('dev-server', (stats) => {
        // check if server has been closed
        if (closed) return;
        // clear console if in iteractive mode
        if (interactive) clearConsole();
        // extract relevant data from stats
        const updated = addCompilationResults(latest, stats, usingTypescript);
        // Keep hold of latest stats so they can be propagated to new clients
        latest = updated;
        // format extracted errors / warnings
        const { errors, warnings } = webpackMessages.format(updated);
        if (errors.length) {
            console.log(chalk`{bold.red Failed to compile.}\n${errors.join('')}`);
        } else if (warnings.length) {
            console.log(chalk`{bold.yellow Compiled with warnings.}\n${warnings.join('')}`);
        } else {
            console.log(chalk.bold.green('Compiled successfully!'));
        }
        // publish build stats
        publish(responses, { action: 'done', ...updated });
    });

    // add middleware to intercept requests to `path`
    router.use((req, res, next) => {
        if (closed || req.path !== path) {
            next();
            return;
        }
        // set response headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        // check if http-version is 1
        if (!(parseInt(req.httpVersion, 10) >= 2)) {
            req.socket.setKeepAlive(true);
            res.setHeader('Connection', 'keep-alive');
        }
        res.writeHead(200);
        res.write('\n');
        // store response
        responses.push(res);
        req.on('close', () => {
            if (!res.writableEnded) res.end();
            // remove res from response array
            const index = responses.findIndex((r) => r === res);
            if (index >= 0) responses.splice(index, 1);
        });
        // publish latest build object to new response
        publish([res], { action: 'sync', ...latest });
    });

    // expose close method
    router.close = (cb) => {
        // check if already closed
        if (closed) return;
        // set closed state
        closed = true;
        // clear interval
        clearInterval(interval);
        // end open requests
        responses.forEach((res) => {
            if (!res.writableEnded) res.end();
        });
        // reset responses array
        responses = [];
        // close webpack-dev-middleware (stop watching files)
        middleware.close(cb);
    };

    // expose webpack compiler with getter
    Object.defineProperty(router, 'compiler', { get: () => compiler, configurable: false });
    // expose closed state with getter
    Object.defineProperty(router, 'closed', { get: () => closed, configurable: false });
    // return router
    return router;
};