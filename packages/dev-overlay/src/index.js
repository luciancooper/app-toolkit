// eslint-disable-next-line import/no-unresolved
import overlayScript from 'overlay';

let iframe = null,
    isLoadingIframe = false,
    isIframeReady = false,
    currentBuildData = null;

function updateIframeContent() {
    if (!iframe) {
        throw new Error('Iframe has not been created yet.');
    }
    // pass error data to the iframe hook. Returns boolean
    const rendered = iframe.contentWindow.updateContent(currentBuildData);
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

export function reportBuildErrors(data) {
    currentBuildData = data;
    update();
}

export function reportBuildWarnings(data) {
    currentBuildData = data;
    update();
}

export function dismiss() {
    currentBuildData = null;
    update();
}