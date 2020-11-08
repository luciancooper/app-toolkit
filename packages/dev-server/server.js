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

    async listen(port) {
        const openPort = await choosePort(port);
        this.server.listen(openPort, () => {
            // open app in browser
            openBrowser(`http://localhost:${openPort}`);
        });
    }

    close(cb) {
        // close dev middleware
        this.middleware.close(() => {
            // destroy all sockets & close server
            this.server.kill(cb);
        });
    }
};