/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint import/no-unresolved: [2, { ignore: ['overlay-(?:js|css)$'] }] */

import overlayScript from 'overlay-js';
import overlayStyle from 'overlay-css';
import type { ErrorData } from '@lcooper/webpack-messages';
import type { Overlay, CompilationStatus, RuntimeErrorRecord } from './types';
import parseFrames from './utils/parse-frames';
import enhanceFrames from './utils/enhance-frames';
import LazyHighlighter from './utils/lazy-highlighter';
import warningIcon from './assets/warning.svg';

declare global {
    interface Window {
        __overlayReady: () => void
    }
}

const highlighter = new LazyHighlighter();

const enum Mode {
    /**
     * Webpack is compiling
     */
    Compiling = -1,
    /**
     * Build was successful with no warnings or errors
     */
    NoProblems = 0,
    /**
     * Build had warnings that are currently minimized
     */
    WarningsMinimized = 1,
    /**
     * Build had warnings that are currently visible
     */
    Warnings = 2,
    /**
     * Build failed with errors
     */
    CompileErrors = 3,
}

interface OverlayIFrameElement extends HTMLIFrameElement {
    readonly contentWindow: (WindowProxy & Overlay) | null
}

type RenderCallback = () => void;

let iframe: OverlayIFrameElement | undefined,
    isLoadingIframe = false,
    isIframeReady = false,
    messageBanner: HTMLElement | null = null,
    warningButton: HTMLElement | null = null,
    warningsMinimized = true,
    currentMode: Mode = Mode.Compiling,
    deferredRender: RenderCallback | null = null,
    currentBuildData: CompilationStatus | null = null,
    runtimeErrors: RuntimeErrorRecord[] = [];

function extractProblems({ errors, warnings, tsc }: CompilationStatus): [ErrorData[], ErrorData[]] {
    return [
        errors ?? [],
        tsc ? [...(warnings ?? []), ...(tsc.errors ?? []), ...(tsc.warnings ?? [])] : warnings ?? [],
    ];
}

/**
 * Ensures the iframe is ready before running a render function, otherwise render will be deferred
 * @param {Function} render - Callback that updates the overlay iframe
 */
function updateOverlay(render: RenderCallback) {
    // loading iframe can be either sync or async depending on the browser.
    if (isLoadingIframe) {
        // iframe is loading - first render will happen soon
        deferredRender = render;
        return;
    }
    if (isIframeReady) {
        // iframe is ready - call the render function
        render();
        return;
    }

    // defer the render function
    deferredRender = render;

    // schedule the first render
    isLoadingIframe = true;

    // create overlay root container
    const root = document.createElement('div');
    root.id = '__dev-overlay-root';
    root.style.cssText = [
        'position: absolute',
        'width: 0',
        'height: 0',
        'font-family: monospace',
        'font-size: 12px',
    ].join(';');

    // create iframe element
    const loadingIframe = root.appendChild(document.createElement('iframe'));
    // apply iframe styles
    loadingIframe.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'width: 100%',
        'height: 100%',
        'border: none',
        'z-index: 2147483647',
    ].join(';');
    // inject overlay script into iframe when it is ready
    loadingIframe.onload = () => {
        const contentDocument = loadingIframe.contentDocument ?? loadingIframe.contentWindow?.document;
        if (contentDocument?.body != null) {
            iframe = loadingIframe;
            // inject <style> containing overlay css
            const style = contentDocument.createElement('style');
            // @ts-expect-error - From `style-loader` to support IE8 and below
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (style.styleSheet) style.styleSheet.cssText = overlayStyle;
            else style.appendChild(contentDocument.createTextNode(overlayStyle));
            contentDocument.head.appendChild(style);
            // inject <script> containing overlay code
            const script = contentDocument.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = overlayScript;
            // inject the script
            contentDocument.body.appendChild(script);
        }
    };

    // create warning button
    warningButton = root.appendChild(document.createElement('div'));
    warningButton.style.cssText = [
        'display: none',
        'position: fixed',
        'top: 0',
        'right: 0',
        'cursor: pointer',
        'border-radius: 0.3em',
        'width: 1.5em',
        'height: 1.5em',
        'margin: 0.5em 0.5em 0 0',
        'border: 2px solid #ae8d1e',
        `background: #f8efd3 url("${warningIcon}") 50% 100% no-repeat border-box`,
        'z-index: 10000',
    ].join(';');
    warningButton.addEventListener('click', (evt) => {
        updateOverlay(() => {
            if (currentMode !== 1) return;
            // hide the notification banner
            warningButton!.style.display = 'none';
            // change current mode
            currentMode = 2;
            // update warnings minimized flag
            warningsMinimized = false;
            // render compile warnings
            const [, warnings] = extractProblems(currentBuildData!);
            iframe?.contentWindow?.renderCompileWarnings(warnings, highlighter);
            iframe!.style.display = '';
        });
    });

    // create message banner
    messageBanner = root.appendChild(document.createElement('div'));
    messageBanner.style.cssText = [
        'display: none',
        'position: fixed',
        'top: 0',
        'right: 0',
        'padding: 0.5em 1em',
        'margin: 0.5em 0.5em 0 0',
        'pointer-events: none',
        'border-right: 3px solid #b3b3b3',
        'background-color: #e6e6e6',
        'z-index: 10001',
    ].join(';');

    // mount root onto document body
    document.body.appendChild(root);
}

// this is a hidden function that allows this entry point to communicate to child overlay
window.__overlayReady = () => {
    isIframeReady = true;
    isLoadingIframe = false;
    // set clear callback
    iframe?.contentWindow?.setClearCallback(clearRuntimeErrors);
    // set minimize callback
    iframe?.contentWindow?.setMinimizeCallback(() => {
        updateOverlay(() => {
            if (currentMode !== 2) return;
            // unhide the warning icon
            warningButton!.style.display = '';
            // change current mode
            currentMode = 1;
            // update warnings minimized flag
            warningsMinimized = true;
            // render runtime errors
            const rendered = iframe?.contentWindow?.renderRuntimeErrors(runtimeErrors, highlighter);
            iframe!.style.display = rendered ? '' : 'none';
        });
    });
    // call the deferred render function
    if (deferredRender) {
        deferredRender();
        deferredRender = null;
    }
};

export function setBuildData(data: CompilationStatus) {
    if (currentBuildData && currentBuildData.hash !== data.hash) {
        highlighter.reset();
    }
    currentBuildData = data;
    highlighter.addAll(data.fileMap);

    updateOverlay(() => {
        // check if webpack is recompiling
        if (currentBuildData!.compiling) {
            // set banner message
            messageBanner!.innerHTML = 'Compiling...';
            messageBanner!.style.display = '';
            // reset mode
            currentMode = Mode.Compiling;
            return;
        }
        // hide the message banner
        messageBanner!.innerHTML = '';
        messageBanner!.style.display = 'none';
        // hide the warning icon
        warningButton!.style.display = 'none';

        const [errors, warnings] = extractProblems(currentBuildData!);
        // check for errors
        if (errors.length) {
            iframe?.contentWindow?.renderCompileErrors(errors, highlighter);
            iframe!.style.display = '';
            currentMode = Mode.CompileErrors;
            return;
        }
        // check for unminimized warnings
        if (warnings.length && !warningsMinimized) {
            iframe?.contentWindow?.renderCompileWarnings(warnings, highlighter);
            iframe!.style.display = '';
            currentMode = Mode.Warnings;
            return;
        }
        if (warnings.length) {
            // show the warning icon
            warningButton!.style.display = '';
            currentMode = Mode.WarningsMinimized;
        } else {
            currentMode = Mode.NoProblems;
        }
        const rendered = iframe?.contentWindow?.renderRuntimeErrors(runtimeErrors, highlighter);
        iframe!.style.display = rendered ? '' : 'none';
    });
}

function updateRuntimeErrors() {
    updateOverlay(() => {
        if (currentMode >= 2) return;
        const rendered = iframe?.contentWindow?.renderRuntimeErrors(runtimeErrors, highlighter);
        iframe!.style.display = rendered ? '' : 'none';
    });
}

export function clearRuntimeErrors() {
    runtimeErrors = [];
    // queue overlay update
    updateRuntimeErrors();
}

async function handleRuntimeError(error: Error, isUnhandledRejection = false) {
    // check if error is a duplicate
    if (runtimeErrors.some(({ error: e }) => e === error)) return;

    let stackFrames;
    // parse stack frames
    try {
        stackFrames = parseFrames(error);
    } catch (e) {
        console.log(`Could not get stack frames: ${(e as Error)?.message}`);
        return;
    }

    // create error record
    const errorRecord = {
        error,
        isUnhandledRejection,
        stackFrames,
    };

    // add record to runtime error array
    runtimeErrors = [...runtimeErrors, errorRecord];

    // enhance stack frames
    try {
        errorRecord.stackFrames = await enhanceFrames(stackFrames, highlighter);
    } catch (e) {
        console.log(`Could not enhance stack frames: ${(e as Error)?.message}`);
    }
    // queue overlay update
    updateRuntimeErrors();
}

let unregisterRuntimeListeners: (() => void) | null = null;

export function startReportingRuntimeErrors() {
    if (unregisterRuntimeListeners !== null) {
        throw new Error('Already listening for runtime errors');
    }

    // add error event handler
    const errorHandler = (event: ErrorEvent) => {
        if (!event || !event.error) return;
        const error = (event.error instanceof Error) ? event.error : new Error(event.error);
        handleRuntimeError(error, false);
    };
    window.addEventListener('error', errorHandler);

    // add unhandled rejection event handler
    const rejectionHandler = (event: PromiseRejectionEvent) => {
        const error = (event?.reason)
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