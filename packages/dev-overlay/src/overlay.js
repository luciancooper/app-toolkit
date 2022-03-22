import './overlay.scss';
import CompileErrorContainer from './containers/CompileErrorContainer';
import CompileWarningContainer from './containers/CompileWarningContainer';
import RuntimeErrorContainer from './containers/RuntimeErrorContainer';

let iframeRoot = null,
    clearCallback = null,
    minimizeCallback = null;

window.renderCompileErrors = (errors, highlighter) => {
    // clear the iframe root
    iframeRoot.innerHTML = '';
    // render compile errors
    iframeRoot.appendChild(
        <CompileErrorContainer
            errors={errors}
            highlighter={highlighter}
        />,
    );
    return true;
};

window.renderCompileWarnings = (warnings, highlighter) => {
    // clear the iframe root
    iframeRoot.innerHTML = '';
    // render compile warnings
    iframeRoot.appendChild(
        <CompileWarningContainer
            warnings={warnings}
            highlighter={highlighter}
            onMinimize={minimizeCallback}
        />,
    );
    return true;
};

window.renderRuntimeErrors = (runtimeErrors, highlighter) => {
    // clear the iframe root
    iframeRoot.innerHTML = '';
    // render runtime errors if any exist
    if (runtimeErrors.length) {
        iframeRoot.appendChild(
            <RuntimeErrorContainer
                errors={runtimeErrors}
                highlighter={highlighter}
                onClose={clearCallback}
            />,
        );
        return true;
    }
    return false;
};

window.setClearCallback = (cb) => {
    clearCallback = cb;
};

window.setMinimizeCallback = (cb) => {
    minimizeCallback = cb;
};

document.body.style.margin = '0';
document.body.style.maxWidth = '100vw';
// create overlay root element
iframeRoot = <div className='overlay-root'/>;
// mount root element
document.body.appendChild(iframeRoot);
// trigger entry client ready hook
window.parent.__overlayReady();