declare module '*.svg' {
    const src: string;
    export default src;
}

// file is injected by webpack during build
declare module 'overlay-js' {
    const src: string;
    export default src;
}

// file is injected by webpack during build
declare module 'overlay-css' {
    const src: string;
    export default src;
}