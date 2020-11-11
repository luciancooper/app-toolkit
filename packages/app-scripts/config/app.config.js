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

function resolvePages(config) {
    let { pages } = config;
    if (!pages || typeof pages !== 'object') {
        return [{
            name: 'index',
            entry: resolveModule(config.entry || 'src/index'),
            html: path.resolve(paths.root, config.html || 'src/index.html'),
        }];
    }
    // determine base html
    const { html: baseHtml = 'src/index.html' } = config;

    // if pages is an object, convert to an array
    if (!Array.isArray(pages)) {
        pages = Object.entries(pages).map(([name, item]) => {
            if (!item || !['string', 'object'].includes(typeof item)) return null;
            // check if item is string
            return (typeof item === 'string') ? { name, entry: item } : { name, ...item };
        }).filter(Boolean);
    }
    return pages.reduce(
        (acc, page) => {
            let [name, entry, html] = [];
            if (typeof page === 'string') {
                [entry, html] = [page, baseHtml];
            } else {
                ({ name, entry, html = baseHtml } = page);
            }
            if (!name) ({ name } = path.parse(entry));
            // add page item
            acc.push({
                name: uniquePageName(name, acc),
                entry: resolveModule(entry),
                html: path.resolve(paths.root, html),
            });
            // return accumulator
            return acc;
        },
        // check config.entry
        (config.entry && typeof config.entry === 'string') ? [{
            name: 'index',
            entry: resolveModule(config.entry),
            html: path.resolve(paths.root, baseHtml),
        }] : [],
    );
}

let config = {};

if (fs.existsSync(paths.config)) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    config = require(paths.config);
}

module.exports = {
    target: config.target || 'web',
    publicPath: config.publicPath || '/',
    pages: resolvePages(config),
    config,
};