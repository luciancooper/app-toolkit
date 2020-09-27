/**
 * @file
 * development server inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

const http = require('http'),
    express = require('express'),
    chalk = require('chalk'),
    webpackDevMiddleware = require('webpack-dev-middleware'),
    errorFormatter = require('./format-errors');

module.exports = class {
    constructor(compiler, {
        path = '/__dev-server',
        heartbeat = 10 * 1000,
    } = {}) {
        this.compiler = compiler;

        const { options: config } = compiler;

        // setup express app
        this.app = express();

        // setup & add dev middleware
        this.middleware = webpackDevMiddleware(compiler, {
            publicPath: config.output.publicPath,
            stats: 'none',
            quiet: true,
            noInfo: true,
        });
        this.app.use(this.middleware);

        // create response cache
        this.responses = [];
        // set interval
        this.interval = setInterval(() => {
            this.responses.forEach((res) => {
                res.write('data: \uD83D\uDC93\n\n');
            });
        }, heartbeat).unref();
        // stash last stats object
        this.latestStats = null;
        // can't remove compiler hooks, so we just set a flag and noop if closed
        this.closed = false;

        // 'invalid' event fires when you have changed a file, and webpack is recompiling a bundle.
        compiler.hooks.invalid.tap('invalid', () => {
            // check if server has been closed
            if (this.closed) return;
            // clear latest stats
            this.latestStats = null;
            // write message to console
            console.log('Compiling...');
            // publish 'building' event
            this.publish({ action: 'building' });
        });

        // 'done' event fires when webpack has finished recompiling the bundle.
        compiler.hooks.done.tap('done', (stats) => {
            // check if server has been closed
            if (this.closed) return;
            // extract relevant data from stats
            const extracted = this.extractStats(stats);
            // Keep hold of latest stats so they can be propagated to new clients
            this.latestStats = extracted;
            // log errors / warnings / successful compile
            if (extracted.errors.length) {
                console.log(chalk.bold.red('Failed to compile.'));
                console.log(extracted.errors.join(''));
            } else if (extracted.warnings.length) {
                console.log(chalk.bold.yellow('Compiled with warnings.'));
                console.log(extracted.warnings.join(''));
            } else {
                console.log(chalk.bold.green('Compiled successfully!'));
            }
            // publish build stats
            this.publish({
                action: 'built',
                ...extracted,
            });
        });

        // add middleware to intercept requests to `path`
        this.app.use((req, res, next) => {
            if (this.closed || req.path !== path) {
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
            this.responses.push(res);
            req.on('close', () => {
                if (!res.writableEnded) res.end();
                // remove res from response array
                const index = this.responses.findIndex((r) => r === res);
                if (index >= 0) this.responses.splice(index, 1);
            });
            // publish latest stats if they exist
            if (this.latestStats) {
                this.publish({
                    action: 'sync',
                    ...this.latestStats,
                });
            }
        });

        // create server
        this.server = http.createServer(this.app);

        this.server.on('error', (err) => {
            console.log(err);
        });

        // create array to store sockets
        this.sockets = [];
        // track socket connections
        this.server.on('connection', (socket) => {
            // add socket to array
            this.sockets.push(socket);
            // add close handler
            socket.once('close', () => {
                // remove socket from list
                this.sockets.splice(this.sockets.indexOf(socket), 1);
            });
        });
    }

    extractStats(stats) {
        const { hash, startTime, endTime } = stats,
            time = endTime - startTime,
            name = stats.name || (stats.compilation && stats.compilation.name) || '';
        // extract errors & warnings
        let errors = [],
            warnings = [];
        if (stats.hasErrors()) {
            errors = errorFormatter.extractErrors(stats);
        } else if (stats.hasWarnings()) {
            warnings = errorFormatter.extractWarnings(stats);
        }
        return {
            name,
            time,
            hash,
            errors,
            warnings,
        };
    }

    publish(payload) {
        // check if event stream has been closed
        if (this.closed) return;
        // stringify the payload data
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        // write the payload data to each response
        this.responses.forEach((res) => {
            res.write(data);
        });
    }

    listen(port, cb) {
        return this.server.listen(port, cb);
    }

    close(cb) {
        // check if already closed
        if (this.closed) return;
        // set closed flag
        this.closed = true;
        // clear interval
        clearInterval(this.interval);
        // end open requests
        this.responses.forEach((res) => {
            if (!res.writableEnded) res.end();
        });
        // reset responses array
        this.responses = [];
        // destroy all sockets
        this.sockets.forEach((socket) => {
            socket.destroy();
        });
        // reset socket array
        this.sockets = [];
        // close listening app
        this.server.close(() => {
            this.middleware.close(cb);
        });
    }
};