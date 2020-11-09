/**
 * @file
 * development middleware inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

const express = require('express'),
    chalk = require('chalk'),
    webpack = require('webpack'),
    webpackDevMiddleware = require('webpack-dev-middleware'),
    webpackMessages = require('@lcooper/webpack-messages'),
    clearConsole = require('./lib/clear-console'),
    prependEntry = require('./lib/prepend-entry');

function extractStats(stats) {
    const { hash, startTime, endTime } = stats,
        time = endTime - startTime,
        name = stats.name || (stats.compilation && stats.compilation.name) || '',
        // extract errors & warnings
        { errors, warnings } = webpackMessages.extract(stats);
    return {
        name,
        time,
        hash,
        errors,
        warnings,
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
        // eslint-disable-next-line global-require
        stylelintPlugin.options.formatter = require('@lcooper/webpack-messages/stylelint-formatter');
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

    // instantiate webpack-dev-middleware
    const middleware = webpackDevMiddleware(compiler, {
            publicPath: config.output.publicPath,
            logLevel: 'silent',
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

    // stash last stats object
    let latestStats = null,
        // can't remove compiler hooks, so we just set a flag and noop if closed
        closed = false;

    // 'invalid' event fires when you have changed a file, and webpack is recompiling a bundle.
    compiler.hooks.invalid.tap('invalid', () => {
        // check if server has been closed
        if (closed) return;
        // clear console if in iteractive mode
        if (interactive) clearConsole();
        // clear latest stats
        latestStats = null;
        // write message to console
        console.log('Compiling...');
        // publish 'building' event
        publish(responses, { action: 'building' });
    });

    // 'done' event fires when webpack has finished recompiling the bundle.
    compiler.hooks.done.tap('done', (stats) => {
        // check if server has been closed
        if (closed) return;
        // clear console if in iteractive mode
        if (interactive) clearConsole();
        // extract relevant data from stats
        const extracted = extractStats(stats);
        // Keep hold of latest stats so they can be propagated to new clients
        latestStats = extracted;
        // format extracted errors / warnings
        const { errors, warnings } = webpackMessages.format(extracted);
        if (errors.length) {
            console.log(chalk`{bold.red Failed to compile.}\n${errors.join('')}`);
        } else if (warnings.length) {
            console.log(chalk`{bold.yellow Compiled with warnings.}\n${warnings.join('')}`);
        } else {
            console.log(chalk.bold.green('Compiled successfully!'));
        }
        // publish build stats
        publish(responses, {
            action: 'built',
            ...extracted,
        });
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
        // publish latest stats if they exist
        if (latestStats) {
            publish(responses, {
                action: 'sync',
                ...latestStats,
            });
        }
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