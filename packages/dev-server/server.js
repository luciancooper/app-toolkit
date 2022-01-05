/**
 * @file
 * development server inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

const http = require('http'),
    express = require('express'),
    killable = require('killable'),
    openBrowser = require('better-opn'),
    middleware = require('./middleware'),
    choosePort = require('./lib/choose-port');

module.exports = class {
    /**
     * Create a new dev server instance
     * @param {Object} config - webpack config
     * @param {Object} options - dev server options
     */
    constructor(config, options = {}) {
        // create dev-middleware
        this.middleware = middleware(config, options);
        // setup express app
        this.app = express();
        // add middleware router to app
        this.app.use(this.middleware);
        // create server
        this.server = http.createServer(this.app);

        this.server.on('error', (err) => {
            console.log(err);
            // shut down and exit
            this.close(() => {
                process.exit(1);
            });
        });

        killable(this.server);
    }

    /**
     * Instruct the server to start listening for connections
     * @param {Object} options - options object
     * @param {number} [options.port=3000] - target port to listen on
     * @param {boolean} [options.open=true] - open browser on server start
     * @param {Function} cb - function to call when server starts listening
     */
    async listen({ port = 3000, open = true } = {}, cb = null) {
        const openPort = await choosePort(port);
        this.server.listen(openPort, () => {
            // execute callback
            if (cb) cb(openPort);
            // open app in browser
            if (open) openBrowser(`http://localhost:${openPort}`);
        });
    }

    /**
     * Shut down the server and stop watching for file changes
     * @param {Function} cb - function to call when server has been closed
     */
    close(cb) {
        // close dev middleware
        this.middleware.close(() => {
            // destroy all sockets & close server
            this.server.kill(cb);
        });
    }
};