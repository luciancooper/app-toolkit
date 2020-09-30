let iframeRoot = null;

// hook that overlay can call to pass build info to the iframe
window.updateContent = ({ warnings, errors }) => {
    // console.log(`overlay updating content `, )
    const errorCount = (errors && errors.length) || 0,
        warningCount = (warnings && warnings.length) || 0;
    if (errorCount + warningCount === 0) {
        // clear the iframe root
        iframeRoot.innerHTML = '';
        return false;
    }
    const summary = [
        ...errorCount ? [`${errorCount} error${errorCount > 1 ? 's' : ''}`] : [],
        ...warningCount ? [`${warningCount} warning${warningCount > 1 ? 's' : ''}`] : [],
    ].join(' and ');
    iframeRoot.innerHTML = `compiled with ${summary}`;
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