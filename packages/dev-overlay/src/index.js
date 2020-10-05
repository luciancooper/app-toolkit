// eslint-disable-next-line import/no-unresolved
import overlayScript from 'overlay';
import parseFrames from './utils/parse-frames';
import enhanceFrames from './utils/enhance-frames';

let iframe = null,
    isLoadingIframe = false,
    isIframeReady = false,
    currentBuildData = null,
    runtimeErrors = [];

function updateIframeContent() {
    if (!iframe) {
        throw new Error('Iframe has not been created yet.');
    }
    // pass error data to the iframe hook. Returns boolean
    const rendered = iframe.contentWindow.updateContent(
        currentBuildData || {},
        runtimeErrors,
    );
    if (!rendered) {
        // no errors exist - destroy the overlay
        document.body.removeChild(iframe);
        iframe = null;
        isIframeReady = false;
    }
}

function update() {
    // loading iframe can be either sync or async depending on the browser.
    if (isLoadingIframe) {
        // iframe is loading - first render will happen soon
        return;
    }
    if (isIframeReady) {
        // iframe is ready - update it.
        updateIframeContent();
        return;
    }
    // schedule the first render
    isLoadingIframe = true;
    const loadingIframe = document.createElement('iframe');
    // apply iframe styles
    loadingIframe.style.position = 'fixed';
    loadingIframe.style.top = '0';
    loadingIframe.style.left = '0';
    loadingIframe.style.width = '100%';
    loadingIframe.style.height = '100%';
    loadingIframe.style.border = 'none';
    loadingIframe.style.zIndex = 2147483647;
    // inject overlay script into iframe when it is ready
    loadingIframe.onload = () => {
        const { contentDocument } = loadingIframe;
        if (contentDocument != null && contentDocument.body != null) {
            iframe = loadingIframe;
            // create <script> containing overlay code
            const script = loadingIframe.contentWindow.document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = overlayScript;
            // inject the script
            contentDocument.body.appendChild(script);
        }
    };
    document.body.appendChild(loadingIframe);
}

window.__overlayReady = () => {
    isIframeReady = true;
    isLoadingIframe = false;
    updateIframeContent();
};

export function setBuildData(data) {
    currentBuildData = data;
    update();
}

async function handleRuntimeError(error, isUnhandledRejection = false) {
    // check if error is a duplicate
    if (runtimeErrors.some(({ error: e }) => e === error)) return;

    let stackFrames;
    // parse stack frames
    try {
        stackFrames = parseFrames(error);
    } catch (e) {
        console.log(`Could not get stack frames: ${e.mesage || e}`);
        return;
    }
    // enhance stack frames
    try {
        stackFrames = await enhanceFrames(stackFrames);
    } catch (e) {
        console.log(`Could not enhance stack frames: ${e.message || e}`);
    }
    // add error data to runtimeErrors array
    runtimeErrors = [
        ...runtimeErrors,
        {
            error,
            isUnhandledRejection,
            stackFrames,
        },
    ];
    // queue overlay update
    update();
}

let unregisterRuntimeListeners = null;

export function startReportingRuntimeErrors() {
    if (unregisterRuntimeListeners !== null) {
        throw new Error('Already listening for runtime errors');
    }

    // add error event handler
    const errorHandler = (event) => {
        if (!event || !event.error) return;
        const error = (event.error instanceof Error) ? event.error : new Error(event.error);
        handleRuntimeError(error, false);
    };
    window.addEventListener('error', errorHandler);

    // add unhandled rejection event handler
    const rejectionHandler = (event) => {
        const error = (event && event.reason)
            ? (event.reason instanceof Error) ? event.reason : new Error(event.reason)
            : new Error('Unknown');
        handleRuntimeError(error, true);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    // create unregister listeners function
    unregisterRuntimeListeners = () => {
        window.removeEventListener('unhandledrejection', rejectionHandler);
        window.removeEventListener('error', errorHandler);
    };
}

export function stopReportingRuntimeErrors() {
    if (unregisterRuntimeListeners === null) {
        throw new Error('Not currently listening for runtime errors');
    }
    unregisterRuntimeListeners();
    unregisterRuntimeListeners = null;
}