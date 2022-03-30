import './index.scss';
import type { Overlay } from '../types';
import CompileErrorContainer from './containers/CompileErrorContainer';
import CompileWarningContainer from './containers/CompileWarningContainer';
import RuntimeErrorContainer from './containers/RuntimeErrorContainer';

type Callback = () => void;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Window extends Overlay {}
}

// create overlay root element
const iframeRoot = <div className='overlay-root'/> as HTMLElement;

let clearCallback: Callback | undefined,
    minimizeCallback: Callback | undefined;

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

window.setClearCallback = (callback) => {
    clearCallback = callback;
};

window.setMinimizeCallback = (callback) => {
    minimizeCallback = callback;
};

document.body.style.margin = '0';
document.body.style.maxWidth = '100vw';
// mount root element
document.body.appendChild(iframeRoot);
// trigger entry client ready hook
(window.parent as unknown as { __overlayReady: () => void }).__overlayReady();