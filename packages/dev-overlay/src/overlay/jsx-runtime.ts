type Nested<T> = T | T[];

type Flatten<T> = { [K in keyof T]: T[K] };

type JSXElement = HTMLElement | DocumentFragment;

// General attributes that are applied to both inherient types and value types

type Children = JSXElement | string | number | false | null | undefined | Children[];

interface Props {
    children?: Children
    class: never
}

type ClassName = Nested<Record<string, boolean | null | undefined> | string | number | false | null | undefined>;

type StyleKey = {
    [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] extends string ? K : never
}[Exclude<keyof CSSStyleDeclaration, number>];

type Style = string | Partial<Record<StyleKey, string>>;

type FunctionComponent<P = {}> = (props: P & Props) => JSXElement;

type EventHandler<E extends Event, T extends EventTarget> = (this: T, event: E & { currentTarget: T }) => void;

/**
 * Group of attributes that apply to all node types
 */
interface DOMProps<T extends HTMLElement> {
    innerHTML?: string
    textContent?: string
    className?: ClassName
    style?: Style
    data?: Record<string, string | number>
    // Fires when the user clicks the left mouse button on the object
    onClick?: EventHandler<MouseEvent, T>
}

// every single html property goes here
interface SelectedProps {
    cellPadding?: number | string
    cellSpacing?: number | string
    disabled?: boolean
    checked?: boolean
    cols?: number
    colSpan?: number
    span?: number
    content?: string
    contentEditable?: boolean
    rows?: number
    rowSpan?: number
    tabIndex?: number
    type?: string
}

type HTMLProps<
    T extends HTMLElement,
    K extends keyof SelectedProps = never,
> = Flatten<DOMProps<T> & Pick<SelectedProps, K>>;

type Attributes<T extends HTMLElement = HTMLElement> = Flatten<DOMProps<T> & SelectedProps>;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        type Element = JSXElement;

        interface ElementClass {
            render: () => JSXElement
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface IntrinsicAttributes {}

        interface IntrinsicElements {
            // block elements
            div: HTMLProps<HTMLDivElement>
            header: HTMLProps<HTMLElement>
            main: HTMLProps<HTMLElement>
            nav: HTMLProps<HTMLElement>
            p: HTMLProps<HTMLParagraphElement>
            section: HTMLProps<HTMLElement>
            pre: HTMLProps<HTMLPreElement>
            // inline elements
            code: HTMLProps<HTMLElement>
            i: HTMLProps<HTMLElement>
            a: HTMLProps<HTMLAnchorElement>
            b: HTMLProps<HTMLElement>
            em: HTMLProps<HTMLElement>
            span: HTMLProps<HTMLSpanElement>
            strong: HTMLProps<HTMLElement>
            var: HTMLProps<HTMLElement>
            u: HTMLProps<HTMLElement>
            // list elements
            ol: HTMLProps<HTMLOListElement>
            ul: HTMLProps<HTMLUListElement>
            li: HTMLProps<HTMLLIElement>
            // table elements
            table: HTMLProps<HTMLTableElement>
            thead: HTMLProps<HTMLTableSectionElement>
            tbody: HTMLProps<HTMLTableSectionElement>
            tfoot: HTMLProps<HTMLTableSectionElement>
            tr: HTMLProps<HTMLTableRowElement>
            th: HTMLProps<HTMLTableCellElement, 'colSpan' | 'rowSpan'>
            td: HTMLProps<HTMLTableCellElement, 'colSpan' | 'rowSpan'>
            col: HTMLProps<HTMLTableColElement, 'span'>
            colgroup: HTMLProps<HTMLTableColElement>
            caption: HTMLProps<HTMLTableCaptionElement>
            // controls
            button: HTMLProps<HTMLButtonElement, 'disabled' | 'type'>
            input: HTMLProps<HTMLInputElement>
            select: HTMLProps<HTMLSelectElement>
            optgroup: HTMLProps<HTMLOptGroupElement>
            option: HTMLProps<HTMLOptionElement>
            textarea: HTMLProps<HTMLTextAreaElement>
        }
    }
}

function appendChildren(parent: JSXElement, child: Children) {
    if (child == null || child === false) {
        return;
    }
    if (Array.isArray(child)) {
        for (const c of child) {
            appendChildren(parent, c);
        }
        return;
    }
    let node = parent;
    if ((parent as Element).localName === 'template') {
        ({ content: node } = parent as HTMLTemplateElement);
    }
    // const node = ((parent).localName === 'template') ? (parent as HTMLTemplateElement).content : parent;
    node.append((typeof child === 'string' || typeof child === 'number') ? String(child) : child);
}

function* flattenClassName(arg: ClassName): Generator<string> {
    // ignore '', null, undefined
    if (!arg) return;
    // yield numbers and strings
    if (typeof arg === 'number' || typeof arg === 'string') {
        yield String(arg);
    } else if (!Array.isArray(arg)) {
        // yield mapped keys
        for (const [key, value] of Object.entries(arg)) {
            if (value) yield key;
        }
    } else {
        for (const a of arg) {
            yield* flattenClassName(a);
        }
    }
}

function setClassName(node: HTMLElement, attr: ClassName) {
    if (attr) {
        node.className = [...flattenClassName(attr)].join(' ');
    }
}

function setStyle(styleDeclaration: CSSStyleDeclaration, style: Style) {
    if (typeof style !== 'string') {
        for (const [key, value] of Object.entries(style)) {
            styleDeclaration[key as StyleKey] = value;
        }
    } else {
        styleDeclaration.cssText = style;
    }
}

function setAttributes(element: HTMLElement, attrs: Attributes) {
    if (attrs.className) {
        setClassName(element, attrs.className);
    }
    if (attrs.style) {
        setStyle(element.style, attrs.style);
    }
    // set rest of the attributes
    for (const [key, value] of Object.entries(attrs)) {
        // ensure value is not null
        if (!value) continue;
        // check for event handler
        if (typeof value === 'function') {
            const eid = key.toLowerCase().slice(2) as keyof ElementEventMap;
            element.addEventListener(eid, value as (this: Element, ev: Event) => any);
            continue;
        }
        switch (key) {
            // check for className
            case 'className':
                setClassName(element, value as ClassName);
                break;
            // check for style property
            case 'style':
                setStyle(element.style, value as Style);
                break;
            // set inner html
            case 'innerHTML':
                element.innerHTML = value as string;
                break;
            // set text content
            case 'textContent':
                element.textContent = value as string;
                break;
            // set data
            case 'data':
                for (const [k, v] of Object.entries(value as Record<string, string | number>)) {
                    element.dataset[k] = String(v);
                }
                break;
            default:
                // @ts-expect-error ignoring typescript here
                element[key] = value;
                break;
        }
    }
}

export const Fragment = (props: { children?: Children }) => {
    const docfrag = document.createDocumentFragment();
    // append children
    appendChildren(docfrag, props.children);
    // return element
    return docfrag;
};

function jsx(type: string, props: Props & Attributes): JSXElement;
function jsx<P>(type: FunctionComponent<P>, props: Props & P): JSXElement;
function jsx<P>(type: string | FunctionComponent<P>, props: Props & (Attributes & P)): JSXElement {
    if (typeof type === 'string') {
        const { children, ...attrs } = props as (Props & Attributes),
            node = document.createElement(type);
        // append children
        appendChildren(node, children);
        // apply attributes
        setAttributes(node, attrs);
        return node;
    }
    return type(props as (Props & P));
}

export { jsx, jsx as jsxs };