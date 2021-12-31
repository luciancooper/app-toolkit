import type { Configuration } from 'webpack';

export interface Options {
    /**
     * Enable interactive mode, where the console is cleared each time the bundle is compiled
     * @defaultValue `false`
     */
    interactive?: boolean

    /**
     * Path on which to serve the event stream
     * @defaultValue `'/__dev-server'`
     */
    path?: string

    /**
     * Interval to send updates to the client to keep the connection alive
     * @defaultValue `10000`
     */
    heartbeat?: number
}

export interface ListenOptions {
    /**
     * Target port for the server to listen on
     * @defaultValue `3000`
     */
    port?: number

    /**
     * Open up the browser when the server starts
     * @defaultValue `true`
     */
    open?: boolean
}

export default class DevServer {
    /**
     * Create a new dev server
     * @param config - Webpack configuration object
     * @param options - Server options
     */
    constructor(config: Configuration, options?: Options)

    /**
     * Instructs the server to start listening for connections.
     * @param options - listen options object
     * @param callback - function to call when server starts listening
     */
    listen(options?: ListenOptions, callback?: (port: number) => any): void;

    /**
     * Shut down the server and stop watching for file changes.
     * @param callback - function to call when server has been closed
     */
    close(callback?: () => any): void;
}