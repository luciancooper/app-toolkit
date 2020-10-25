/**
 * @file
 * development server inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

const http = require('http'),
    express = require('express'),
    openBrowser = require('better-opn'),
    middleware = require('./dev-middleware'),
    choosePort = require('./utils/choose-port');

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
            // destroy all sockets
            this.sockets.forEach((socket) => {
                socket.destroy();
            });
            // reset socket array
            this.sockets = [];
            // close listening app
            this.server.close(cb || (() => {}));
        });
    }
};