const chalk = require('chalk'),
    RequestShortener = require('webpack/lib/RequestShortener');

const requestShortener = new RequestShortener(process.cwd());

/**
 * Extract errors or warnings from stats compilation
 * @param {Object} compilation - webpack compilation object
 * @param {string} [type='errors'] - 'errors' or 'warnings'
 */
function extractFromCompilation(compilation, type = 'errors') {
    const { [type]: items } = compilation;
    if (items.length === 0 && compilation.children) {
        return compilation.children.flatMap((child) => extractFromCompilation(child, type));
    }
    return items;
}

/**
 * Extract relevant data from a webpack error
 * @param {WebpackError} webpackError
 * @returns {Object} - error data object
 */
function extractError(webpackError) {
    const { message, name } = webpackError,
        originalKey = name === 'ModuleWarning' ? 'warning' : 'error';
    // extract original error
    let originalError = webpackError;
    while (originalError[originalKey] != null) {
        ({ [originalKey]: originalError } = originalError);
    }
    // get file name
    let { file } = webpackError;
    if (
        !file
        && webpackError.module
        && webpackError.module.readableIdentifier
        && typeof webpackError.module.readableIdentifier === 'function'
    ) {
        file = webpackError.module.readableIdentifier(requestShortener);
    }
    // extract origin
    const origin = [];
    if (webpackError.dependencies && webpackError.origin) {
        origin.push({
            id: webpackError.origin.readableIdentifier(requestShortener),
            loc: webpackError.dependencies
                .map((dep) => {
                    if (!dep.loc || typeof dep.loc === 'string') return '';
                    const { loc: { start, end } } = dep;
                    if (!start || !end) return '';
                    return (start.line !== end.line)
                        ? `${start.line}:${start.column}-${end.line}:${end.column}`
                        : `${start.line}:${start.column}-${end.column}`;
                })
                .filter(Boolean),
        });
        let current = webpackError.origin;
        while (current.issuer && typeof current.issuer.readableIdentifier === 'function') {
            current = current.issuer;
            origin.push({
                id: current.readableIdentifier(requestShortener),
            });
        }
    }
    // return error data
    return {
        name,
        file,
        message,
        origin,
        webpackError,
        originalError,
    };
}

function isEslintError({ originalError: { name } }) {
    return name === 'ESLintError';
}

function isStylelintError({ name }) {
    return name === 'StylelintError';
}

function isModuleNotFoundError({ name, message, webpackError: { dependencies } }) {
    return name === 'ModuleNotFoundError'
        && message.indexOf('Module not found') === 0
        && (dependencies && dependencies.length > 0);
}

function isSyntaxError({ name, originalError: { name: originalName } }) {
    return name === 'ModuleBuildError' && ['SyntaxError', 'SassError'].includes(originalName);
}

function filterChain(errors, filters) {
    const chain = [];
    chain.push(
        filters.reduce((errs, filter) => {
            const matched = [];
            chain.push(matched);
            return errs.filter((e) => {
                if (filter(e)) {
                    matched.push(e);
                    return false;
                }
                return true;
            });
        }, errors),
    );
    return chain;
}

/**
 * Format file path
 * @param {string} file - a file path
 * @returns {string} - formatted file path
 */
function formatFilepath(file) {
    const split = file.lastIndexOf('!');
    return split !== 1
        ? chalk.dim(file.slice(0, split + 1)) + chalk.bold(file.slice(split + 1))
        : chalk.bold(file);
}

/**
 * Format error origin trace
 * @param {Object[]} origin - array of origin identifiers and location strings
 * @returns {string} - formatted origin output
 */
function formatOrigin(origin) {
    let formatted = origin.map(({ id, loc = [] }) => (
        chalk`\n {bold.gray @} ${id}{dim ${loc.map((l) => ` ${l}`).join('')}}`
    )).join('');
    if (formatted) {
        formatted = `\n${formatted}`;
    }
    return formatted;
}

/**
 * Format module not found errors
 * @param {Object[]} errors - error data objects
 * @returns {string[]} - processed error message chunks
 */
function formatModuleNotFoundErrors(errors) {
    if (errors.length === 0) return [];
    let modules = [...new Set(errors.map(({ module }) => module))];
    // sort dependencies before relative import modules
    modules = [
        ...modules.filter((module) => !/^\.{1,2}\//.test(module)),
        ...modules.filter((module) => /^\.{1,2}\//.test(module)),
    ];
    // create a processed error chunk for each missing module
    return modules.map((mod) => {
        const moduleErrors = errors.filter(({ module }) => mod === module),
            files = moduleErrors
                .map(({ file }) => file)
                .filter(Boolean)
                .map((file) => formatFilepath(file)),
            filePath = files.length > 2
                // use oxford comma
                ? ` in ${files.slice(0, files.length - 1).join(', ')}, and ${files[files.length - 1]}`
                : files.length
                    ? ` in ${files.join(' and ')}`
                    : '';
        return chalk`{bold Module Not Found:} Can't resolve {bold.blue ${mod}}${filePath}`;
    });
}

/**
 * Format linting errors
 * @param {Object[]} eslintErrors - eslint error data objects
 * @param {Object[]} stylelintErrors - stylelint error data objects
 * @returns {string[]} - processed error message chunks
 */
function formatLintErrors(eslintErrors, stylelintErrors) {
    if (eslintErrors.length + stylelintErrors.length === 0) return [];

    return [
        ...eslintErrors.length ? [
            [
                `ESLint found problems in ${eslintErrors.length} file${eslintErrors.length > 1 ? 's' : ''}`,
                ...eslintErrors.map(({ originalError: { message } }) => message.trim()),
            ].join('\n\n'),
        ] : [],
        ...stylelintErrors.length ? [
            [
                `Stylelint found problems in ${stylelintErrors.length} file${stylelintErrors.length > 1 ? 's' : ''}`,
                ...stylelintErrors.map(({ message }) => message.trim()),
            ].join('\n\n'),
        ] : [],
    ];
}

/**
 * Process errors into formatted chunks
 * @param {Object[]} errors - array of error data objects
 * @returns {string[]} - array of processed error chunks
 */
function processErrors(errors) {
    const [
        syntaxErrors,
        moduleNotFoundErrors,
        eslintErrors,
        stylelintErrors,
        uncategorized,
    ] = filterChain(errors, [
        isSyntaxError,
        isModuleNotFoundError,
        isEslintError,
        isStylelintError,
    ]);

    return [
        // format syntax errors
        ...syntaxErrors.map(({
            file,
            origin,
            originalError,
        }) => [
            file ? `in ${formatFilepath(file)}\n\n` : '\n\n',
            // clean up the original error message
            originalError.toString()
                // clean up duplicate error titles
                .replace(/^([\w]+Error): \1: /, '$1: ')
                // remove syntax error file path
                .replace(/^SyntaxError: (?:\/[^:]+:\s)?/, 'SyntaxError: ')
                // strip internal stacks unless they contain `webpack:`
                .replace(/^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(?:\n|$)/gm, '') // at ... ...:x:y
                .replace(/^\s*at\s((?!webpack:).)*<anonymous>[\s)]*(?:\n|$)/gm, '') // at ... <anonymous>
                .replace(/^\s*at\s<anonymous>(?:\n|$)/gm, '') // at <anonymous>
                // trim the message
                .trim(),
            // format origin trace
            formatOrigin(origin),
        ].join('')),

        // format module not found errors
        ...formatModuleNotFoundErrors(moduleNotFoundErrors.map((error) => {
            const { webpackError: { dependencies: [dependency] } } = error,
                module = dependency.request || dependency.options.request;
            return {
                ...error,
                module,
            };
        })),

        // format linting errors
        ...formatLintErrors(eslintErrors, stylelintErrors),

        // format uncategorized errors
        ...uncategorized.map(({
            file,
            message,
            origin,
        }) => [
            file ? `in ${formatFilepath(file)}\n\n` : '\n\n',
            // clean up webpack error message
            message
                // split lines
                .split('\n')
                // strip webpack-added headers
                .filter((line) => !/Module [A-z ]+\(from/.test(line))
                // transform parsing error into syntax error
                .map((l) => {
                    const parsingError = /Line (\d+):(?:(\d+):)?\s*Parsing error: (.+)$/.exec(l);
                    if (!parsingError) return l;
                    const [, line, col, msg] = parsingError;
                    return `Syntax error: ${msg} (${line}:${col})`;
                })
                // rejoin lines
                .join('\n')
                // smoosh syntax errors (commonly found in CSS)
                .replace(/SyntaxError\s+\((\d+):(\d+)\)\s*(.+?)\n/g, 'SyntaxError: $3 ($1:$2)\n')
                // clean up export errors
                .replace(
                    /^.*export '(.+?)' was not found in '(.+?)'.*$/gm,
                    "Attempted import error: '$1' is not exported from '$2'.",
                )
                .replace(
                    /^.*export 'default' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm,
                    "Attempted import error: '$2' does not contain a default export (imported as '$1').",
                )
                .replace(
                    /^.*export '(.+?)' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm,
                    "Attempted import error: '$1' is not exported from '$3' (imported as '$2').",
                )
                // clean up file name
                .replace(/^(.*) \d+:\d+-\d+(?=\n|$)/, '$1')
                // strip internal stacks unless they contain `webpack:`
                .replace(/^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(?:\n|$)/gm, '') // at ... ...:x:y
                .replace(/^\s*at\s((?!webpack:).)*<anonymous>[\s)]*(?:\n|$)/gm, '') // at ... <anonymous>
                .replace(/^\s*at\s<anonymous>(?:\n|$)/gm, '') // at <anonymous>
                // remove duplicate newlines
                .replace(/(?:^[\t\f\v ]*\n){2,}/gm, '\n')
                // trim the message
                .trim(),
            // format origin trace
            formatOrigin(origin),
        ].join('')),
    ];
}

/**
 * Find and format all warnings in a webpack stats object
 * @param {Object} stats - webpack stats object
 * @returns {string} - readable warnings output
 */
exports.logWarnings = (stats) => {
    const items = extractFromCompilation(stats.compilation, 'warnings'),
        extracted = items.map((e) => extractError(e)),
        processed = processErrors(extracted),
        badge = chalk.yellow.inverse(' WARNING ');
    return processed.map((chunk) => `\n${badge} ${chunk}\n`).join('');
};

/**
 * Find and format all errors in a webpack stats object
 * @param {Object} stats - webpack stats object
 * @returns {string} - readable errors output
 */
exports.logErrors = (stats) => {
    const items = extractFromCompilation(stats.compilation, 'errors'),
        extracted = items.map((e) => extractError(e)),
        processed = processErrors(extracted),
        badge = chalk.red.inverse(' ERROR ');
    return processed.map((chunk) => `\n${badge} ${chunk}\n`).join('');
};