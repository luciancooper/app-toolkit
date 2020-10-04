/* eslint-env browser */
/* eslint-disable no-use-before-define */

/**
 * @file
 * Inspired by `webpack-hot-middleware/client` and `webpack-dev-server/client`
 */

const hotEmitter = require('webpack/hot/emitter'),
    overlay = require('@lcooper/dev-overlay');

const path = '/__dev-server',
    timeout = 20 * 1000;

let isUnloading = false;

function processMessage({ action, ...data }) {
    // action is either 'building', 'built', or 'sync'
    if (action === 'building') {
        console.log(`[dev-server] bundle ${data.name ? `'${data.name}' ` : ''}rebuilding`);
        return;
    }
    if (action === 'built') {
        console.log(`[dev-server] bundle ${data.name ? `'${data.name}' ` : ''}rebuilt in ${data.time}ms`);
    }
    // pass data to overlay
    overlay.setBuildData(data);

    const { name, errors, warnings } = data;
    // check for errors
    if (errors && errors.length > 0) {
        // report errors and exit, do not apply update
        console.error(
            `%c[dev-server] bundle${name ? ` '${name}' ` : ''} has error${errors.length} ${errors.length > 1 ? 's' : ''}`,
            'color:#ff0000',
        );
        return;
    }
    // check for warnings
    if (data.warnings && data.warnings.length > 0) {
        // log warnings to console
        console.warn(
            `%c[dev-server] bundle${name ? ` '${name}' ` : ''} has ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`,
            'color:#999933',
        );
    }
    if (isUnloading) return;
    hotEmitter.emit('webpackHotUpdate', data.hash);
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
    console.warn('app-scripts dev-server client requires EventSource');
} else {
    connect();
    // tell overlay to register runtime error listeners
    overlay.startReportingRuntimeErrors();
}