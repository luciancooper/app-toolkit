/**
 * @file
 * development middleware inspired by `webpack-dev-server` and `webpack-hot-middleware`
 */

import express from 'express';
import type { IRouter, Response } from 'express';
import chalk from 'chalk';
import fs from 'fs';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { extract as extractMessages, format as formatMessages, tsError } from '@lcooper/webpack-messages';
import stylelintFormatter from '@lcooper/webpack-messages/stylelint-formatter';
import type { TSIssue, TSErrorData, ErrorData } from '@lcooper/webpack-messages';
import clearConsole from './utils/clear-console';
import prependEntry from './utils/prepend-entry';

export interface Options {
    /**
     * Enable interactive mode, where the console is cleared each time the bundle is compiled
     * @defaultValue false
     */
    interactive?: boolean
    /**
     * Path on which to serve the event stream
     * @defaultValue '/__dev-server'
     */
    path?: string
    /**
     * Interval to send updates to the client to keep the connection alive
     * @defaultValue 10000
     */
    heartbeat?: number
}

interface BuildInfo {
    hash: string | null
    compiling: boolean
    awaitingTypeCheck: boolean
    time?: number
    name?: string
    errors?: ErrorData[]
    warnings?: ErrorData[]
    tsc?: { errors: TSErrorData[], warnings: TSErrorData[] }
    fileMap?: Record<string, string>
}

function updateFileMap<T extends BuildInfo>(latest: T) {
    const { errors = [], warnings = [], fileMap = {} } = latest,
        { errors: tsErrors = [], warnings: tsWarnings = [] } = latest.tsc ?? {},
        sourceFiles = [...errors, ...warnings, ...tsErrors, ...tsWarnings]
            .filter((e) => (e.type === 'tsc' && e.file))
            .map<string>((e) => (e as TSErrorData).file!)
            // remove duplicate & non-existent files
            .filter((file, i, files) => files.indexOf(file) === i && fs.existsSync(file));
    // update latest file map
    for (const file of sourceFiles) {
        if (!fileMap[file]) {
            fileMap[file] = fs.readFileSync(file, 'utf-8');
        }
    }
    latest.fileMap = fileMap;
    return latest;
}

function addCompilationResults(latest: BuildInfo, stats: webpack.Stats, usingTypescript: boolean) {
    const info = {
        // get compilation hash
        hash: stats.hash!,
        // calculate compilation time
        time: stats.endTime - stats.startTime,
        // get compilation name
        name: stats.compilation.name,
        // extract errors & warnings
        ...extractMessages(stats),
    } as const;
    return updateFileMap((latest.hash && latest.hash !== info.hash) ? {
        ...info,
        compiling: false,
        awaitingTypeCheck: usingTypescript,
    } : {
        ...latest,
        ...info,
        compiling: false,
    });
}

function addTypescriptResults(latest: BuildInfo, issues: TSIssue[], compilation: webpack.Compilation) {
    if (latest.hash && latest.hash !== compilation.hash) {
        throw new Error('TypeScript results out of sync with compilation');
    }
    return updateFileMap({
        ...latest,
        hash: compilation.hash ?? null,
        tsc: {
            errors: issues.filter(({ severity }) => severity === 'error').map(tsError),
            warnings: issues.filter(({ severity }) => severity === 'warning').map(tsError),
        },
        awaitingTypeCheck: false,
    });
}

function publish(responses: Response[], payload: any) {
    // stringify the payload data
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    // write the payload data to each response
    responses.forEach((res) => {
        res.write(data);
    });
}

type CloseCallback = (err: Error | null | undefined) => void;

export interface Middleware extends IRouter {
    /**
     * Close the dev server middleware and stop watching for changes
     * @param callback - A function that will be called once the middleware has stopped watching for changes
     */
    close: (callback: CloseCallback) => any
    /**
     * Get the webpack compiler instance the middleware is using
     */
    readonly compiler: webpack.Compiler
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
export default function middleware(config: webpack.Configuration, {
    interactive = false,
    path = '/__dev-server',
    heartbeat = 10 * 1000,
}: Options = {}): Middleware {
    // inject client entries into the config
    config.entry = prependEntry(config.entry, [
        `${require.resolve('@lcooper/dev-server/client/entry')}?path=${path}&timeout=${heartbeat * 2}`,
        require.resolve('webpack/hot/dev-server'),
    ]);
    // inject development plugins into the config
    config.plugins = config.plugins ?? [];
    // inject HotModuleReplacementPlugin into the config if it doesnt already exist
    if (!config.plugins.some((plugin) => plugin.constructor.name === 'HotModuleReplacementPlugin')) {
        config.plugins.push(
            new webpack.HotModuleReplacementPlugin(),
        );
    }
    // inject eslint-formatter into eslint-webpack-plugin if present
    const eslintPlugin = config.plugins.find((plugin) => (
        plugin.constructor.name === 'ESLintWebpackPlugin'
    )) as unknown as ({ options: { formatter: any } } | null);
    if (eslintPlugin) {
        eslintPlugin.options.formatter = require.resolve('@lcooper/webpack-messages/eslint-formatter');
    }
    // inject stylelint-formatter into stylelint-webpack-plugin if present
    const stylelintPlugin = config.plugins.find((plugin) => (
        plugin.constructor.name === 'StylelintWebpackPlugin'
    )) as unknown as ({ options: { formatter: any } } | null);
    if (stylelintPlugin) {
        stylelintPlugin.options.formatter = stylelintFormatter;
    }
    // check if using typescript
    const usingTypescript = config.plugins.some((plugin) => plugin.constructor.name === 'ForkTsCheckerWebpackPlugin');
    // create webpack compiler instance
    let compiler: webpack.Compiler;
    try {
        compiler = webpack(config);
    } catch ({ message }) {
        // log error and exit
        console.log(chalk`{bold.red Error initializing webpack compiler:}\n\n${message}\n`);
        process.exit(1);
    }

    // instantiate webpack-dev-middleware
    const devMiddleware = webpackDevMiddleware(compiler, {
            publicPath: config.output!.publicPath,
        }),
        // create express router
        router = express.Router() as Middleware;

    // add webpack-dev-middleware to router
    router.use(devMiddleware);

    // create responses cache
    let responses: Response[] = [];
    // set interval
    const interval = setInterval(() => {
        responses.forEach((res) => {
            res.write('data: \uD83D\uDC93\n\n');
        });
    }, heartbeat).unref();

    // set latest results object
    let latest: BuildInfo = { hash: null, compiling: true, awaitingTypeCheck: usingTypescript },
        // can't remove compiler hooks, so we just set a flag and noop if closed
        closed = false;

    if (usingTypescript) {
        // set up fork-ts-checker-webpack-plugin hooks
        const hooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);

        // add hook to log message about waiting for ts results
        hooks.waiting.tap('dev-server', (compilation: webpack.Compilation) => {
            console.log(chalk.cyan('Files successfully emitted, waiting for TypeScript results...'));
        });

        // issues hook fires when type check is complete
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        hooks.issues.tap('dev-server', (issues: TSIssue[], compilation: webpack.Compilation) => {
            // check if server has been closed
            if (closed) return [];
            // augment latest stats object with ts issue results
            let updated;
            try {
                updated = addTypescriptResults(latest, issues, compilation);
            } catch (error) {
                console.log(chalk`{red [ERROR]} ${(error as Error).message}`);
                return [];
            }
            // store updated stats object so they can be propagated to new clients
            latest = updated;
            // format extracted typescript errors / warnings
            const { errors, warnings } = formatMessages(updated.tsc);
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
        const { errors, warnings } = formatMessages(updated);
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
    router.close = (callback) => {
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
        devMiddleware.close(callback);
    };

    // expose webpack compiler with getter
    Object.defineProperty(router, 'compiler', { get: () => compiler, configurable: false });
    // expose closed state with getter
    Object.defineProperty(router, 'closed', { get: () => closed, configurable: false });
    // return router
    return router;
}