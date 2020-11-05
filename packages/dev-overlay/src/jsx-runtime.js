function appendChildren(parent, children) {
    if (Array.isArray(children)) {
        children.forEach((child) => {
            appendChildren(parent, child);
        });
    } else if (children != null) {
        parent.appendChild(
            children.nodeType
                ? children
                : document.createTextNode(children),
        );
    }
}

const propKeys = [
    'innerHTML',
    'className',
    'contentEditable',
    'value',
    'checked',
    'multiple',
    'muted',
    'selected',
    'tabIndex',
    'src',
    'href',
    'action',
];

function setStyle(element, style) {
    if (typeof style === 'string') {
        element.style = style;
        return;
    }
    Object.entries(style).forEach(([key, value]) => {
        element.style[key] = value;
    });
}

function setProps(element, props) {
    Object.entries(props).forEach(([name, value]) => {
        // check for event
        if (name.startsWith('on') && name.toLowerCase() in window) {
            element.addEventListener(name.slice(2).toLowerCase(), value);
            return;
        }
        // check for style property
        if (name === 'style') {
            setStyle(element, value);
            return;
        }
        // check for property key
        if (propKeys.includes(name)) {
            element[name] = value;
        } else if (typeof value === 'boolean') {
            if (value) element.setAttribute(name, '');
        } else {
            element.setAttribute(name, value);
        }
    });
}

function jsx(tag, props) {
    if (typeof tag === 'function') {
        return tag(props);
    }
    const element = document.createElement(tag),
        { children, ...attrs } = props;
    // set attribute props
    setProps(element, attrs);
    // append children
    if (children != null) {
        appendChildren(element, children);
    }
    // return element
    return element;
}

function Fragment({ children }) {
    const fragment = document.createDocumentFragment();
    // append children
    if (children != null) {
        appendChildren(fragment, children);
    }
    // return fragment
    return fragment;
}

export { jsx, jsx as jsxs, Fragment };