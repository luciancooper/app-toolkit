import type { Configuration, Compiler } from 'webpack';
import type { IRouter } from 'express';
import type { Options } from './server';

export interface DevServerMiddleware extends IRouter {
    /**
     * Close the dev server middleware and stop watching for changes
     * @param callback - A function that will be called once the middleware has stopped watching for changes
     */
    close: (callback?: (err?: Error) => void) => void

    /**
     * Get the webpack compiler instance the middleware is using
     */
    readonly compiler: Compiler

    /**
     * True if the middleware has been closed
     */
    readonly closed: boolean
}

/**
 * Create a new dev server middleware handler
 * @param config - Webpack configuration object
 * @param options - Options object
 */
export default function middleware(config: Configuration, options?: Options): DevServerMiddleware;