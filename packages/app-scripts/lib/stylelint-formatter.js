const path = require('path'),
    chalk = require('chalk');

module.exports = (results, returnValue) => {
    // count total errors and warnings
    const problems = results.flatMap(({ warnings = [], ignored = false }) => (ignored ? [] : warnings)).length;
    // check for no errors and warnings
    if (problems === 0) return '[]';
    // transform results data and stringify
    return JSON.stringify(
        results
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
                }) => ({
                    line: String(line),
                    column: String(column),
                    message: text
                        // remove rule id from message
                        .replace(/\s\(.+\)$/g, '')
                        // bold inline code strings
                        .replace(/\B([`'])(.*?)\1\B/g, (m, delim, code) => chalk.bold(code)),
                    ruleId: rule,
                    severity: (severity === 2 || severity === 'error') ? 2 : 1,
                })),
            })),
    );
};