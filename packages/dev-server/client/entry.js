/* eslint-env browser */
/* eslint-disable no-use-before-define */
/* global __resourceQuery */

/**
 * @file
 * Inspired by `webpack-hot-middleware/client` and `webpack-dev-server/client`
 */

const hotEmitter = require('webpack/hot/emitter'),
    overlay = require('@lcooper/dev-overlay');

const {
    path = '/__dev-server',
    timeout = 20 * 1000,
} = (typeof __resourceQuery === 'string' && __resourceQuery.trim().replace(/^\?/, ''))
    ? __resourceQuery.trim().replace(/^\?/, '').split('&').reduce((acc, param) => {
        const qs = param.replace(/\+/g, '%20'),
            idx = qs.indexOf('=');
        // split key & value
        let [key, value] = (idx >= 0) ? [qs.slice(0, idx), qs.slice(idx + 1)] : [qs, ''];
        // decode uris
        [key, value] = [decodeURIComponent(key), decodeURIComponent(value)];
        // parse value string
        try {
            value = JSON.parse(value);
        } catch (e) {
            // ignore
        }
        // assign key value to accumulator
        acc[key] = Object.hasOwnProperty.call(acc, key) ? [].concat(acc[key], value) : value;
        return acc;
    }, {})
    : {};

let isUnloading = false;

function processMessage({ action, ...data }) {
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
            const { errors, warnings } = data.tsc;
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
            hotEmitter.emit('webpackHotUpdate', data.hash);
        }
    }
}

function connect() {
    // create event source wrapper
    let source,
        lastActivity = new Date();

    // listen for unload events
    window.addEventListener('beforeunload', () => {
        isUnloading = true;
    });

    init();

    const timer = setInterval(() => {
        if (new Date() - lastActivity > timeout) {
            handleDisconnect();
        }
    }, timeout / 2);

    function init() {
        source = new window.EventSource(path);
        // handle online
        source.onopen = () => {
            console.log('[dev-server] connected');
            lastActivity = new Date();
        };
        // handle disconnect
        source.onerror = handleDisconnect;
        // handle message
        source.onmessage = (event) => {
            lastActivity = new Date();
            if (event.data === '\uD83D\uDC93') {
                return;
            }
            try {
                processMessage(JSON.parse(event.data));
            } catch (err) {
                console.warn(`Invalid message: ${event.data}\n${err}`);
            }
        };
    }

    function handleDisconnect() {
        clearInterval(timer);
        source.close();
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