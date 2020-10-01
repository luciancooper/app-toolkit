const chalk = require('chalk'),
    RequestShortener = require('webpack/lib/RequestShortener'),
    stripAnsi = require('./utils/strip-ansi');

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
    const eslintData = eslintErrors.flatMap(({ originalError: { message } }) => JSON.parse(message.trim())),
        stylelintData = stylelintErrors.flatMap(({ message }) => JSON.parse(message.trim()));
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
 * Extract error data from a webpack stats object
 * @param {Object} stats - webpack stats object
 * @param {string} [type='errors'] - 'errors' or 'warnings'
 * @returns {Object[]} - extracted error or warning data objects
 */
exports.extract = (stats, type = 'errors') => {
    const items = extractFromCompilation(stats.compilation, type),
        errors = items.map((e) => extractError(e)),
        // group extracted errors into category types
        [
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
};

/**
 * Transform errors into formatted readable output chunks
 * @param {Object[]} errors - array of error data objects
 * @param {string} [messageType='error'] - 'error' or 'warning'
 * @returns {string[]} - array of readable output chunks
 */
exports.format = (errors, messageType = 'error') => {
    const badge = (messageType === 'warning')
            ? chalk.yellow.inverse(' WARNING ')
            : chalk.red.inverse(' ERROR '),
        formatted = [];
    // loop through each error data object
    errors.forEach(({ type, ...error }) => {
        switch (type) {
            case 'module-not-found-error': {
                // module not found error
                const { module, files } = error,
                    filePath = files.length > 2
                        // use oxford comma
                        ? ` in ${files.slice(0, files.length - 1).join(', ')}, and ${files[files.length - 1]}`
                        : files.length
                            ? ` in ${files.join(' and ')}`
                            : '';
                formatted.push(
                    chalk`{bold Module Not Found:} Can't resolve {bold.blue ${module}}${filePath}`,
                );
                break;
            }
            case 'lint-errors': {
                const { linters } = error,
                    // find max line, column, and message string width for all linting errors
                    [lineWidth, colWidth, msgWidth] = linters
                        .flatMap(({ files }) => files)
                        .flatMap(({ messages }) => messages)
                        .reduce(([l, c, m], { line, column, message }) => [
                            Math.max(l, line.length),
                            Math.max(c, column.length),
                            Math.max(m, stripAnsi(message).length),
                        ], [0, 0, 0]);

                // for each linter, produce a single message chunk
                formatted.push(...linters.map(({ linter, files }) => {
                    // summarize total error and warning counts
                    const fileCount = files.length,
                        // calculate warning & error counts
                        problems = files.flatMap(({ messages }) => messages.map(({ severity }) => severity)),
                        errorCount = problems.filter((s) => s === 2).length,
                        warningCount = problems.length - errorCount,
                        // create errors & warnings summary statement
                        summary = [
                            errorCount ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : null,
                            warningCount ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : null,
                        ].filter(Boolean).join(' and ');

                    return [
                        // full summary statement
                        `${linter} found ${summary} in ${fileCount} file${fileCount > 1 ? 's' : ''}`,
                        // transform lint result data into pretty cli tables
                        ...files.map(({ filePath, messages }) => [
                            chalk.bold.underline(filePath),
                            ...messages.map(({
                                line,
                                column,
                                message,
                                ruleId,
                                severity,
                            }) => {
                                const lPadding = ' '.repeat(lineWidth - line.length),
                                    cPadding = ' '.repeat(colWidth - column.length),
                                    mPadding = ' '.repeat(msgWidth - stripAnsi(message).length);
                                return [
                                    // error or warning symbol
                                    severity === 2 ? chalk.red(' ✖') : chalk.yellow(' ⚠'),
                                    // location
                                    chalk`${lPadding}{dim ${line}{gray :}${column}}${cPadding}`,
                                    // message
                                    message + mPadding,
                                    // rule id
                                    chalk.dim(ruleId),
                                ].join('  ');
                            }),
                        ].join('\n')),
                    ].join('\n\n');
                }));
                break;
            }
            default: {
                // all other error types
                const { file, message, origin } = error;
                formatted.push([
                    file ? `in ${formatFilepath(file)}\n\n` : '\n\n',
                    message,
                    formatOrigin(origin),
                ].join(''));
                break;
            }
        }
    });
    return formatted.map((chunk) => `\n${badge} ${chunk}\n`);
};