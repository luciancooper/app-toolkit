const path = require('path'),
    chalk = require('chalk'),
    stripAnsi = require('./utils/strip-ansi');

module.exports = (results, data) => {
    // count total errors and warnings
    const problems = results.reduce((t, { errorCount: e, warningCount: w }) => t + e + w, 0);
    // check for no errors and warnings
    if (problems === 0) return '';
    // format results data
    const formatted = results
            .filter(({ messages }) => messages.length)
            .map(({ filePath, messages }) => ({
                // make relative path
                filePath: path.relative('.', filePath),
                // format messages
                messages: messages.map(({
                    ruleId = '',
                    severity,
                    message = '',
                    line = 0,
                    column = 0,
                }) => [
                    String(line),
                    String(column),
                    // bold inline code strings
                    message.replace(/\B([`'])(.*?)\1\B/g, (m, delim, code) => chalk.bold(code)),
                    // error or warning symbol
                    (severity === 2 || severity === 'error') ? chalk.red('✖') : chalk.yellow('⚠'),
                    ruleId,
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
            ...messages.map(([line, column, message, symbol, ruleId]) => {
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
                    chalk.dim(ruleId),
                ].join('  ');
            }),
            '',
        ].join('\n'))
        .join('');
};