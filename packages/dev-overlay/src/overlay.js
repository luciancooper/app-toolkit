import './overlay.scss';

let iframeRoot = null;

function createStackFrame(fn, {
    file,
    line,
    column,
    context,
}) {
    let html = `<div>${fn || '(anonymous function)'} ${file} ${line}:${column}</div>`;
    if (context && context.length) {
        html += `<pre>${context.map(([i, l]) => `<var>[${i}]</var> ${l}`).join('\n')}</pre>`;
    }
    return html;
}

// hook that overlay can call to pass build info to the iframe
window.updateContent = ({ errors = [], warnings = [] }, runtimeErrors = []) => {
    // clear the iframe root
    iframeRoot.innerHTML = '';
    // check if there is nothing to display
    if (!errors.length && !warnings.length && !runtimeErrors.length) {
        return false;
    }
    // check for errors
    if (errors.length) {
        iframeRoot.innerHTML = `Failed to compile: ${errors.length} build error${errors.length > 1 ? 's' : ''}`;
        return true;
    }
    let html = '';
    // check for warnings
    if (warnings.length) {
        html = `Compiled with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`;
    }
    // render runtime errors
    if (runtimeErrors.length) {
        html += runtimeErrors
            .flatMap(({ error, stackFrames }) => [
                `<pre>${error.toString()}</pre>`,
                ...stackFrames.map(({ fn, src, ...loc }) => createStackFrame(fn, src || loc)),
            ])
            .join('\n');
    }
    // set inner html
    iframeRoot.innerHTML = html;
    return true;
};

document.body.style.margin = '0';
document.body.style.maxWidth = '100vw';
// create overlay root element
iframeRoot = document.createElement('div');
iframeRoot.classList.add('overlay-root');
// mount root element
document.body.appendChild(iframeRoot);
// trigger entry client ready hook
window.parent.__overlayReady();