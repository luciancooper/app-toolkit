// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="webpack/module" />
/* eslint-disable @typescript-eslint/no-use-before-define */

/**
 * @file
 * Inspired by `webpack-hot-middleware/client` and `webpack-dev-server/client`
 */

// @ts-expect-error allow webpack/hot/emitter to be untyped
import hotEmitter from 'webpack/hot/emitter';
import * as overlay from '@lcooper/dev-overlay';
import type { ErrorData, TSErrorData } from '@lcooper/webpack-messages';
import type { EventEmitter } from 'stream';

interface EntryOptions {
    /**
     * @defaultValue '__dev-server'
     */
    path?: string
    /**
     * @defaultValue 20000
     */
    timeout?: number
}

const {
    path = '/__dev-server',
    timeout = 20 * 1000,
} = ((): EntryOptions => {
    if (typeof __resourceQuery !== 'string' || !__resourceQuery.trim().replace(/^\?/, '')) {
        return {};
    }
    const query: Record<string, any> = {};
    for (const param of __resourceQuery.trim().replace(/^\?/, '').split('&')) {
        const qs = param.replace(/\+/g, '%20'),
            idx = qs.indexOf('=');
        // split key & value
        let [key, qvalue] = (idx >= 0) ? [qs.slice(0, idx), qs.slice(idx + 1)] : [qs, ''];
        // decode uris
        [key, qvalue] = [decodeURIComponent(key), decodeURIComponent(qvalue)];
        // parse value string
        let value: any = qvalue;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            value = JSON.parse(value);
        } catch (e) {}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        query[key] = Object.hasOwnProperty.call(query, key) ? [].concat(query[key], value) : value;
    }
    return query as EntryOptions;
})();

let isUnloading = false;

type Action = 'invalid' | 'done' | 'sync' | 'typescript';

interface CompilerMessage {
    // yes
    action: Action
    // yes
    hash: string | null
    compiling: boolean
    awaitingTypeCheck: boolean
    // yes
    time?: number
    // yes
    name?: string
    // yes
    errors?: ErrorData[]
    // yes
    warnings?: ErrorData[]
    // yes
    tsc?: { errors: TSErrorData[], warnings: TSErrorData[] }
    fileMap?: Record<string, string>
}

function processMessage({ action, ...data }: CompilerMessage) {
    // pass build data to overlay
    overlay.setBuildData(data);
    // log status updates to console (action is either 'invalid', 'done', 'sync', or 'typescript')
    const bundleName = data.name ? `'${data.name}' ` : '';

    switch (action) {
        case 'invalid':
            console.log(`[dev-server] bundle ${bundleName}rebuilding`);
            break;
        case 'typescript': {
            // log typescript errors / warnings
            const { errors, warnings } = data.tsc!;
            if (errors.length > 0) {
                console.error(
                    `%c[dev-server] bundle ${bundleName}has ${errors.length} TypeScript error(s)`,
                    'color:#ff0000',
                );
            } else if (warnings.length > 0) {
                console.warn(
                    `%c[dev-server] bundle ${bundleName}has ${warnings.length} TypesScript warning(s)`,
                    'color:#999933',
                );
            }
            break;
        }
        // @ts-expect-error allow fallthrough in this case
        case 'done':
            console.log(`[dev-server] bundle ${data.name ? `'${data.name}' ` : ''}rebuilt in ${data.time}ms`);
        // eslint-disable-next-line no-fallthrough
        default: {
            const { errors, warnings } = data;
            // check for errors
            if (errors && errors.length > 0) {
                // report errors and exit, do not apply update
                console.error(
                    `%c[dev-server] bundle ${bundleName}has ${errors.length} error(s)`,
                    'color:#ff0000',
                );
                return;
            }
            // log warnings to console
            if (warnings && warnings.length > 0) {
                console.warn(
                    `%c[dev-server] bundle ${bundleName}has ${warnings.length} warning(s)`,
                    'color:#999933',
                );
            }
            if (isUnloading) return;
            (hotEmitter as EventEmitter).emit('webpackHotUpdate', data.hash);
        }
    }
}

function connect() {
    // create event source wrapper
    let source: EventSource | null = null,
        lastActivity: number = Date.now();

    // listen for unload events
    window.addEventListener('beforeunload', () => {
        isUnloading = true;
    });

    init();

    const timer = setInterval(() => {
        if (Date.now() - lastActivity > timeout) {
            handleDisconnect();
        }
    }, timeout / 2);

    function init() {
        source = new window.EventSource(path);
        // handle online
        source.onopen = () => {
            console.log('[dev-server] connected');
            lastActivity = Date.now();
        };
        // handle disconnect
        source.onerror = handleDisconnect;
        // handle message
        source.onmessage = (event) => {
            lastActivity = Date.now();
            if (event.data === '\uD83D\uDC93') {
                return;
            }
            try {
                processMessage(JSON.parse(event.data));
            } catch (err: unknown) {
                console.warn(`Invalid message: ${event.data}\n\n${(err as Error).message}`);
            }
        };
    }

    function handleDisconnect() {
        clearInterval(timer);
        source?.close();
        setTimeout(init, timeout);
    }
}

if (typeof window === 'undefined') {
    // do nothing
} else if (typeof window.EventSource === 'undefined') {
    console.warn('dev-server client requires EventSource');
} else {
    connect();
    // tell overlay to register runtime error listeners
    overlay.startReportingRuntimeErrors();
}