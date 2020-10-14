import './overlay.scss';
import CompileErrorContainer from './containers/CompileErrorContainer';
import CompileWarningContainer from './containers/CompileWarningContainer';
import RuntimeErrorContainer from './containers/RuntimeErrorContainer';

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
        iframeRoot.appendChild(
            <CompileErrorContainer errors={errors}/>,
        );
        return true;
    }
    // check for warnings
    if (warnings.length) {
        iframeRoot.appendChild(
            <CompileWarningContainer warnings={warnings}/>,
        );
    }
    // render runtime errors
    if (runtimeErrors.length) {
        iframeRoot.appendChild(
            <RuntimeErrorContainer errors={runtimeErrors}/>,
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