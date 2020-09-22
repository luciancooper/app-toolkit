const path = require('path'),
    chalk = require('chalk'),
    stripAnsi = require('./utils/strip-ansi');

module.exports = (results, returnValue) => {
    // count total errors and warnings
    const problems = results.flatMap(({ warnings = [], ignored = false }) => (ignored ? [] : warnings)).length;
    // check for no errors and warnings
    if (problems === 0) return '';
    // format results data
    const formatted = results
            .filter(({ warnings = [], ignored = false }) => !ignored && warnings.length)
            .map(({ source, warnings }) => ({
                // make relative path
                filePath: path.relative('.', source),
                // format messages
                messages: warnings.map(({
                    line = 0,
                    column = 0,
                    rule = '',
                    severity,
                    text = '',
                }) => [
                    String(line),
                    String(column),
                    text
                        // remove rule id from message
                        .replace(/\s\(.+\)$/g, '')
                        // bold inline code strings
                        .replace(/\B([`'])(.*?)\1\B/g, (m, delim, code) => chalk.bold(code)),
                    // error or warning symbol
                    (severity === 2 || severity === 'error') ? chalk.red('✖') : chalk.yellow('⚠'),
                    rule,
                ]),
            })),
        // find max line, column, and message string width
        [lineWidth, colWidth, msgWidth] = formatted
            .flatMap(({ messages }) => messages)
            .reduce(([l, c, m], [line, column, message]) => [
                Math.max(l, line.length),
                Math.max(c, column.length),
                Math.max(m, stripAnsi(message).length),
            ], [0, 0, 0]);
    // loop through each file result
    return formatted
        .map(({ filePath, messages }) => [
            '',
            chalk.bold.underline(filePath),
            ...messages.map(([line, column, message, symbol, rule]) => {
                const lPadding = ' '.repeat(lineWidth - line.length),
                    cPadding = ' '.repeat(colWidth - column.length),
                    mPadding = ' '.repeat(msgWidth - stripAnsi(message).length);
                return [
                    '',
                    // symbol
                    symbol,
                    // location
                    chalk`${lPadding}{dim ${line}{gray :}${column}}${cPadding}`,
                    // message
                    message + mPadding,
                    // rule id
                    chalk.dim(rule),
                ].join('  ');
            }),
            '',
        ].join('\n'))
        .join('');
};