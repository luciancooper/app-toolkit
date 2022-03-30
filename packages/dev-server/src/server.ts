/**
 * @file
 * development server inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

import http from 'http';
import express from 'express';
import openBrowser from 'better-opn';
import type { Socket } from 'net';
import type { Configuration } from 'webpack';
import middleware, { Middleware, Options } from './middleware';
import choosePort from './utils/choose-port';

interface ListenOptions {
    /**
     * Target port for the server to listen on
     * @defaultValue 3000
     */
    port?: number
    /**
     * Open up the browser when the server starts
     * @defaultValue true
     */
    open?: boolean
}

export default class DevServer {
    readonly server: http.Server;

    readonly app: express.Express;

    readonly middleware: Middleware;

    sockets: Socket[] = [];

    /**
     * Create a new dev server instance
     * @param config - Webpack configuration
     * @param options - Server options
     */
    constructor(config: Configuration, options: Options = {}) {
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

        this.server.on('connection', (socket) => {
            // add socket to array
            this.sockets.push(socket);

            socket.once('close', () => {
                // remove socket from array
                const idx = this.sockets.indexOf(socket);
                this.sockets.splice(idx, 1);
            });
        });
    }

    /**
     * Instruct the server to start listening for connections
     * @param options - listen options
     * @param callback - function to call when server starts listening
     */
    async listen(
        { port = 3000, open = true }: ListenOptions = {},
        callback?: (openPort: number) => void,
    ) {
        const openPort = await choosePort(port);
        this.server.listen(openPort, () => {
            // execute callback
            if (callback) callback(openPort);
            // open app in browser
            if (open) openBrowser(`http://localhost:${openPort}`);
        });
    }

    /**
     * Shut down the server and stop watching for file changes.
     * @param callback - function to call when server has been closed
     */
    close(callback?: (err: Error | null | undefined) => void) {
        // close dev middleware
        this.middleware.close(() => {
            // destroy all sockets & close server
            this.server.close(callback);
            // destroy all sockets
            for (const socket of this.sockets) {
                socket.destroy();
            }
            this.sockets = [];
        });
    }
}