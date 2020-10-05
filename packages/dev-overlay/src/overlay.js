let iframeRoot = null;

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
                ...stackFrames.map(({
                    fn,
                    file,
                    line,
                    column,
                    src,
                }) => {
                    const loc = src
                        ? `${src.file} ${src.line}:${src.column}`
                        : `${file} ${line}:${column}`;
                    return `<div>${fn || '(anonymous function)'} ${loc}</div>`;
                }),
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
iframeRoot.style.width = '100%';
iframeRoot.style.height = '100%';
iframeRoot.style.boxSizing = 'border-box';
iframeRoot.style.textAlign = 'center';
iframeRoot.style.backgroundColor = '#353535';
// mount root element
document.body.appendChild(iframeRoot);
// trigger entry client ready hook
window.parent.__overlayReady();