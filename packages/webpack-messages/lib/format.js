const chalk = require('chalk'),
    stripAnsi = require('./utils/strip-ansi');

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
 * Transform errors into formatted readable output chunks
 * @param {Object[]} errors - array of error data objects
 * @returns {string[]} - array of readable output chunks
 */
function formatErrors(errors) {
    const formatted = [];
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
            case 'tsc': {
                let file = chalk.blue(error.relativeFile);
                if (error.location) {
                    const { start: { line, column } } = error.location;
                    file += chalk`:{yellow ${line}}:{yellow ${column}}`;
                }
                formatted.push(chalk`${file}\n{dim ${error.code}:} ${error.message}`);
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
    // return formatted chunks
    return formatted;
}

/**
 * Transform errors into formatted readable output chunks
 * @param {Object} data - extracted data
 * @param {Object[]} data.errors - extracted error data
 * @param {Object[]} data.warnings - extracted warning data
 * @returns {Object} - error & warning data as readable output chunks
 */
module.exports = ({ errors, warnings }) => ({
    errors: formatErrors(errors).map((chunk) => (
        `\n${chalk.red.inverse(' ERROR ')} ${chunk}\n`
    )),
    warnings: formatErrors(warnings).map((chunk) => (
        `\n${chalk.yellow.inverse(' WARNING ')} ${chunk}\n`
    )),
});