const RequestShortener = require('webpack/lib/RequestShortener'),
    tsError = require('./tsError');

const requestShortener = new RequestShortener(process.cwd());

/**
 * Extract errors / warnings from stats compilation
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

function isEslintError({ originalError: { name, message } }) {
    return name === 'ESLintError' && /^lintdata:/.test(message.trim());
}

function isStylelintError({ name, message }) {
    return name === 'StylelintError' && /^lintdata:/.test(message.trim());
}

function isTypescriptError({ webpackError }) {
    return !!(webpackError && webpackError.issue && webpackError.constructor.name === 'IssueWebpackError');
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
 * Transform module not found errors
 * @param {Object[]} errors - extracted error data objects
 * @returns {Object[]} - transformed module not found error objects
 */
function transformModuleNotFoundErrors(errors) {
    if (errors.length === 0) return [];
    // extract module name & error file from each error
    const data = errors.map((error) => {
        const { file, webpackError: { dependencies: [dependency] } } = error,
            module = dependency.request || dependency.options.request;
        return { module, file };
    });
    // create set of unique modules
    let modules = [...new Set(data.map(({ module }) => module))];
    // sort dependencies before relative import modules
    modules = [
        ...modules.filter((module) => !/^\.{1,2}\//.test(module)),
        ...modules.filter((module) => /^\.{1,2}\//.test(module)),
    ];
    // create an error data object for each missing module
    return modules.map((module) => {
        const files = data
            .filter(({ module: m, file }) => (m === module && file))
            .map(({ file }) => file);
        return {
            type: 'module-not-found-error',
            module,
            files,
        };
    });
}

/**
 * Transform linting errors into a single grouped object
 * @param {Object[]} eslintErrors - eslint error data objects
 * @param {Object[]} stylelintErrors - stylelint error data objects
 * @returns {?Object} - a single grouped linting error
 */
function groupLintErrors(eslintErrors, stylelintErrors) {
    if (eslintErrors.length + stylelintErrors.length === 0) return null;
    const eslintData = eslintErrors.flatMap(({ originalError: { message } }) => (
            JSON.parse(message.trim().replace(/^lintdata:/, ''))
        )),
        stylelintData = stylelintErrors.flatMap(({ message }) => (
            JSON.parse(message.trim().replace(/^lintdata:/, ''))
        ));
    return {
        type: 'lint-errors',
        linters: [
            eslintErrors.length ? {
                linter: 'ESLint',
                files: eslintData,
            } : null,
            stylelintErrors.length ? {
                linter: 'Stylelint',
                files: stylelintData,
            } : null,
        ].filter(Boolean),
    };
}

/**
 * Transform a set of webpack errors
 * @param {WebpackError[]} webpackErrors - array of webpack errors
 * @returns {Object[]} - extracted error data objects
 */
function transformErrors(webpackErrors) {
    const errors = webpackErrors.map((e) => extractError(e)),
        // group extracted errors into category types
        [
            syntaxErrors,
            moduleNotFoundErrors,
            eslintErrors,
            stylelintErrors,
            typescriptErrors,
            uncategorized,
        ] = filterChain(errors, [
            isSyntaxError,
            isModuleNotFoundError,
            isEslintError,
            isStylelintError,
            isTypescriptError,
        ]);
    return [
        // transform syntax errors
        ...syntaxErrors.map(({
            file,
            origin,
            originalError,
        }) => ({
            type: 'syntax-error',
            file,
            // clean up the original error message
            message: originalError.toString()
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
            origin,
        })),

        // transform module not found errors
        ...transformModuleNotFoundErrors(moduleNotFoundErrors),

        // transform linting errors
        groupLintErrors(eslintErrors, stylelintErrors),

        // transform typescript errors
        ...typescriptErrors.map(({ webpackError: { issue } }) => tsError(issue)),

        // transform uncategorized errors
        ...uncategorized.map(({
            file,
            message,
            origin,
        }) => ({
            file,
            // clean up webpack error message
            message: message
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
            origin,
        })),
    ].filter(Boolean);
}

/**
 * Extract error / warning data from a webpack stats object
 * @param {Object} stats - webpack stats object
 * @returns {Object} - extracted error & warning data
 */
module.exports = (stats) => {
    let errors = [],
        warnings = [];
    // check for errors or warnings
    if (stats.hasErrors()) {
        errors = transformErrors(
            extractFromCompilation(stats.compilation, 'errors'),
        );
    } else if (stats.hasWarnings()) {
        warnings = transformErrors(
            extractFromCompilation(stats.compilation, 'warnings'),
        );
    }
    return {
        errors,
        warnings,
    };
};