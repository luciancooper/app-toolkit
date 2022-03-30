import chalk from 'chalk';
import fs from 'fs';
import stripAnsi from './utils/strip-ansi';
import highlight from './utils/highlight';
import codeFrame from './utils/code-frame';
import type { ErrorData, Extracted } from './extract';

/**
 * Format file path
 * @param file - a file path
 * @returns formatted file path
 */
function formatFilepath(file: string) {
    const split = file.lastIndexOf('!');
    return split !== 1
        ? chalk.dim(file.slice(0, split + 1)) + chalk.bold(file.slice(split + 1))
        : chalk.bold(file);
}

/**
 * Transform errors into formatted readable output chunks
 * @param errors - array of error data objects
 * @param sourceMap - absolute file paths mapped to highlighted source code
 */
function* formatErrors(errors: ErrorData[], sourceMap: Record<string, string>): Generator<string> {
    // loop through each error data object
    for (const error of errors) {
        switch (error.type) {
            case 'module-not-found-error': {
                // module not found error
                const { module, files } = error,
                    filePath = files.length > 2
                        // use oxford comma
                        ? ` in ${files.slice(0, files.length - 1).join(', ')}, and ${files[files.length - 1]}`
                        : files.length ? ` in ${files.join(' and ')}` : '';
                yield chalk`{bold Module Not Found:} Can't resolve {bold.blue ${module}}${filePath}`;
                break;
            }
            case 'tsc': {
                let file = chalk.blue(error.relativeFile),
                    message = chalk`{dim ${error.code}:} ${error.message}`;
                if (error.location) {
                    const { start: { line, column } } = error.location;
                    file += chalk`:{yellow ${line}}:{yellow ${column}}`;
                    // check if source map contains absolute file path
                    const source = error.file && sourceMap[error.file];
                    if (source) message += `\n${codeFrame(source, error.location)}`;
                }
                yield `${file}\n\n${message}`;
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
                for (const { linter, files } of linters) {
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

                    yield [
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
                }
                break;
            }
            default: {
                // all other error types
                const { file, message } = error;
                yield [
                    file ? `in ${formatFilepath(file)}\n\n` : '\n\n',
                    message,
                ].join('');
                break;
            }
        }
    }
}

/**
 * Transform error / warning data into formatted readable output chunks
 * @param extracted - extracted error / warning data.
 * @returns formatted error and warning messages
 */
export default function format({ errors, warnings }: Extracted) {
    // create map of highlighted typescript source files
    const sourceMap = [...errors, ...warnings]
        .map((e) => (e.type === 'tsc' ? e.file : null))
        // map file path to highlighted source
        .reduce<Record<string, string>>((acc, file, i, files) => {
        // ignore duplicate & non-existent files
        if (file && files.indexOf(file) === i && fs.existsSync(file)) {
            const source = fs.readFileSync(file, 'utf-8')
                // standardize line breaks
                .replace(/\r\n|[\n\r\u2028\u2029]/g, '\n');
            acc[file] = highlight(source);
        }
        return acc;
    }, {});
    // format errors and warnings
    return {
        errors: [...formatErrors(errors, sourceMap)].map((chunk) => (
            `\n${chalk.red.inverse(' ERROR ')} ${chunk}\n`
        )),
        warnings: [...formatErrors(warnings, sourceMap)].map((chunk) => (
            `\n${chalk.yellow.inverse(' WARNING ')} ${chunk}\n`
        )),
    } as const;
}