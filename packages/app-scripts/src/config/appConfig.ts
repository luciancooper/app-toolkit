import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { cosmiconfigSync } from 'cosmiconfig';
import checkBrowsers from './checkBrowsers';
import { root, configPath } from './paths';

export interface AppConfigOptions {
    entry?: string
    html?: string
    pages?: ({ entry: string, name?: string, html?: string } | string)[]
    | Record<string, string | { entry: string, html?: string }>
    source?: string
    output?: string
    publicPath?: string
    target?: string
    tsConfig?: string
}

interface ConfigError {
    severity: 'error' | 'warning'
    message: string
}

interface Page {
    name: string
    entry: string
    html: string
}

export interface AppConfig {
    pages: Page[]
    source: string | string[]
    srcRoot: string
    output: string
    target: string
    publicPath: string
    ts: boolean
    tsConfig: string
    errors: ConfigError[]
}

const defaults = {
    source: 'src',
    output: 'dist',
    target: 'web',
    publicPath: '/',
    html: 'src/index.html',
} as const;

function fileExists(file: string) {
    try {
        fs.accessSync(file, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

function commonPath(paths: string[]): string {
    if (!paths.length) {
        throw new Error('cannot find common directory of 0 paths');
    }
    // parse root directory and path segments
    const parsed = paths.map((dir) => [path.parse(dir).root, dir.split(path.sep).slice(1)] as const);
    // throw error if any paths are relative
    if (parsed.some(([r]) => r === '')) {
        throw new Error('All input paths must be absolute');
    }
    let [commonRoot, common] = parsed[0]!;
    for (const [r, segments] of parsed.slice(1)) {
        // throw error if two paths do not share the same root directory (for example C:\\ & D:\\)
        if (commonRoot !== r) {
            throw new Error('All input paths must have a common root directory');
        }
        // update common path
        common = common.slice(0, Math.max(segments.findIndex((seg, i) => common[i] !== seg), 0));
    }
    return path.resolve(commonRoot, ...common);
}

/**
 * Resolve a file path in the same order as webpack
 */
function resolveModule(file: string) {
    // check if file extension has already been specified
    if (path.extname(file)) return path.resolve(root, file);
    // else determine extension
    const extension = ['mjs', 'js', 'jsx'].find((ext) => (
        fileExists(path.resolve(root, `${file}.${ext}`))
    )) ?? 'js';
    return path.resolve(root, `${file}.${extension}`);
}

function uniquePageName(name: string, pages: Page[]) {
    let unique = name,
        index = 0;
    while (pages.some(({ name: pageName }) => pageName === unique)) {
        index += 1;
        unique = `${name}${index}`;
    }
    return unique;
}

function resolveConfig(config: AppConfigOptions = {}): AppConfig {
    const options = { ...defaults, ...config },
        errors: ConfigError[] = [];
    // detect typescript
    let ts: boolean,
        tsConfig: string;
    if (options.tsConfig) {
        ts = true;
        tsConfig = path.resolve(root, options.tsConfig);
        // ensure specified tsConfig file exists
        if (!fileExists(tsConfig)) {
            errors.push({
                severity: 'error',
                message: chalk`Specified tsconfig {yellow ${path.relative(root, tsConfig)}} does not exist`,
            });
        }
    } else {
        tsConfig = path.resolve(root, './tsconfig.json');
        ts = fileExists(tsConfig);
    }
    // resolve pages
    const pages: Page[] = [];
    if (options.pages && typeof options.pages === 'object') {
        // add index as first page spec if entry is configured
        if (options.entry && typeof options.entry === 'string') {
            pages.push({
                name: 'index',
                entry: resolveModule(options.entry),
                html: path.resolve(root, options.html),
            });
        }
        // resolve pages config
        ((Array.isArray(options.pages) && options.pages) || (
            Object.entries(options.pages)
                .filter(([, spec]) => (spec && ['string', 'object'].includes(typeof spec)))
                .map(([name, spec]) => (typeof spec === 'string' ? { name, entry: spec } : { name, ...spec }))
        )).forEach((spec) => {
            let name: string | undefined,
                pageEntry: string,
                pageHtml: string;
            if (typeof spec === 'string') {
                pageEntry = spec;
                pageHtml = options.html;
            } else {
                pageEntry = spec.entry;
                pageHtml = spec.html ?? options.html;
                name = spec.name;
            }
            if (!name) ({ name } = path.parse(pageEntry));
            pages.push({
                name: uniquePageName(name, pages),
                entry: resolveModule(pageEntry ?? 'index'),
                html: path.resolve(root, pageHtml),
            });
        });
    } else {
        pages.push({
            name: 'index',
            entry: resolveModule(options.entry ?? 'src/index'),
            html: path.resolve(root, options.html),
        });
    }
    // find files that do not exist
    const notFound = pages
        .flatMap(({ entry, html }) => [entry, html])
        .filter((file, i, files) => (files.indexOf(file) === i && !fileExists(file)));
    // check for unfound files
    if (notFound.length) {
        errors.push({
            severity: 'error',
            message: [
                chalk.bold('Could not find the following required file(s):'),
                ...notFound.map((file) => chalk`  {dim ${root + path.sep}}{cyan ${path.relative(root, file)}}`),
            ].join('\n'),
        });
    }
    // ensure check browserslist
    const browserCheck = checkBrowsers(root);
    if (browserCheck) {
        errors.push({ severity: 'warning', message: browserCheck });
    }
    // resolve source directories
    const source = Array.isArray(options.source)
        ? options.source.map((src) => path.resolve(root, src))
        : path.resolve(root, options.source);
    // return app spec
    return {
        source,
        // determine common source path
        srcRoot: typeof source === 'string' ? source : commonPath(source),
        // resolve output directory
        output: path.resolve(root, options.output),
        target: options.target,
        publicPath: options.publicPath,
        pages,
        ts,
        tsConfig,
        errors,
    };
}

export default function loadConfig(): AppConfig {
    const loaded = cosmiconfigSync('app').load(configPath),
        config = (loaded ? loaded.config : {}) as AppConfigOptions;
    return resolveConfig(config);
}