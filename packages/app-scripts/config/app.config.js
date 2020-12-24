const path = require('path'),
    fs = require('fs'),
    paths = require('./paths');

// resolve file paths in the same order as webpack
function resolveModule(file) {
    // check if file extension has already been specified
    if (path.extname(file)) return path.resolve(paths.root, file);
    // else determine extension
    const extension = ['mjs', 'js', 'jsx'].find((ext) => (
        fs.existsSync(path.resolve(paths.root, `${file}.${ext}`))
    )) || 'js';
    return path.resolve(paths.root, `${file}.${extension}`);
}

function uniquePageName(name, pages) {
    let unique = name,
        index = 0;
    while (pages.some(({ name: pageName }) => pageName === unique)) {
        index += 1;
        unique = `${name}${index}`;
    }
    return unique;
}

function resolvePages({ entry, html, pages }) {
    if (!pages || typeof pages !== 'object') {
        return [{
            name: 'index',
            entry: resolveModule(entry || 'src/index'),
            html: path.resolve(paths.root, html),
        }];
    }
    const pageArray = (Array.isArray(pages) && pages) || (
        Object.entries(pages).map(([name, item]) => {
            if (!item || !['string', 'object'].includes(typeof item)) return null;
            // check if item is string
            return (typeof item === 'string') ? { name, entry: item } : { name, ...item };
        }).filter(Boolean)
    );
    return pageArray.reduce((acc, page) => {
        let [name, pageEntry, pageHtml] = [];
        if (typeof page === 'string') {
            [pageEntry, pageHtml] = [page, html];
        } else {
            ({ name, entry: pageEntry, html: pageHtml = html } = page);
        }
        if (!name) ({ name } = path.parse(pageEntry));
        // add page item
        acc.push({
            name: uniquePageName(name, acc),
            entry: resolveModule(pageEntry),
            html: path.resolve(paths.root, pageHtml),
        });
        // return accumulator
        return acc;
    }, (entry && typeof entry === 'string') ? [{
        name: 'index',
        entry: resolveModule(entry),
        html: path.resolve(paths.root, html),
    }] : []);
}

let config = {
    source: 'src',
    output: 'dist',
    target: 'web',
    publicPath: '/',
    html: 'src/index.html',
};

if (fs.existsSync(paths.configPath)) {
    config = {
        ...config,
        // eslint-disable-next-line global-require, import/no-dynamic-require
        ...require(paths.configPath),
    };
}

module.exports = {
    source: Array.isArray(config.source)
        ? config.source.map((src) => path.resolve(paths.root, src))
        : path.resolve(paths.root, config.source),
    output: path.resolve(paths.root, config.output),
    target: config.target,
    publicPath: config.publicPath,
    pages: resolvePages(config),
};