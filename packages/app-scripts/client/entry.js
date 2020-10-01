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

function logProblems(type, { name, [type]: problems }) {
    // console log the problems
    console.log(
        `%c[dev-server] bundle${name ? ` '${name}' ` : ''} has ${problems.length} ${problems.length > 1 ? type : type.slice(0, -1)}`,
        `color:${type === 'warnings' ? '#999933' : '#ff0000'}`,
    );
}

function processMessage({ action, ...data }) {
    // action is either 'building', 'built', or 'sync'
    if (action === 'building') {
        console.log(`[dev-server] bundle ${data.name ? `'${data.name}' ` : ''}rebuilding`);
        return;
    }
    if (action === 'built') {
        console.log(`[dev-server] bundle ${data.name ? `'${data.name}' ` : ''}rebuilt in ${data.time}ms`);
    }
    // check for errors
    if (data.errors && data.errors.length > 0) {
        // report errors and exit, do not apply update
        logProblems('errors', data);
        // report errors to overlay
        overlay.reportBuildErrors(data);
        return;
    }
    // check for warnings
    if (data.warnings && data.warnings.length > 0) {
        logProblems('warnings', data);
        // report warnings to overlay
        overlay.reportBuildWarnings(data);
    } else {
        // dismiss overlay
        overlay.dismiss();
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
}