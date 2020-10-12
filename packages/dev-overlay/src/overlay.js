import './overlay.scss';

let iframeRoot = null;

function createStackFrame(fn, {
    file,
    line,
    column,
    context: ctx,
}) {
    return (
        <div className='stack-frame'>
            <div>{fn || '(anonymous function)'}</div>
            <div>{`${file} ${line}:${column}`}</div>
            {
                ctx && ctx.length && (
                    <pre innerHTML={ctx.map(([i, l]) => `<var>[${i}]</var> ${l}`).join('\n')}/>
                )
            }
        </div>
    );
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
        iframeRoot.appendChild(
            <div>{`Failed to compile: ${errors.length} build error${errors.length > 1 ? 's' : ''}`}</div>,
        );
        return true;
    }
    // check for warnings
    if (warnings.length) {
        iframeRoot.appendChild(
            <div>{`Compiled with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}</div>,
        );
    }
    // render runtime errors
    if (runtimeErrors.length) {
        iframeRoot.appendChild(
            <div className='runtime-errors'>
                {
                    runtimeErrors.map(({ error, stackFrames }) => (
                        <div className='runtime-error'>
                            <pre>{error.toString()}</pre>
                            {stackFrames.map(({ fn, src, ...loc }) => createStackFrame(fn, src || loc))}
                        </div>
                    ))
                }
            </div>,
        );
    }
    return true;
};

document.body.style.margin = '0';
document.body.style.maxWidth = '100vw';
// create overlay root element
iframeRoot = <div className='overlay-root'/>;
// mount root element
document.body.appendChild(iframeRoot);
// trigger entry client ready hook
window.parent.__overlayReady();