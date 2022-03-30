import path from 'path';
import chalk from 'chalk';
import type { Formatter, LintResult, LinterResult } from 'stylelint';

const stylelintFormatter: Formatter = (results: LintResult[], returnValue?: LinterResult) => {
    // count total errors and warnings
    const problems = results.flatMap(({ warnings = [], ignored = false }) => (ignored ? [] : warnings)).length;
    // check for no errors and warnings
    if (problems === 0) return 'lintdata:[]';
    // transform results data and stringify
    const json = JSON.stringify(
        results
            .filter(({ warnings = [], ignored = false }) => !ignored && warnings.length)
            .map(({ source, warnings }) => ({
                // make relative path
                filePath: source ? path.relative('.', source) : '?',
                // format messages
                messages: warnings.map(({
                    line = 0,
                    column = 0,
                    rule = '',
                    severity,
                    text = '',
                }) => ({
                    line: (line != null && !Number.isNaN(line)) ? String(line) : '0',
                    column: (column != null && !Number.isNaN(column)) ? String(column) : '0',
                    message: text
                        // remove rule id from message
                        .replace(/\s\(.+\)$/g, '')
                        // bold inline code strings
                        .replace(/\B([`'])(.*?)\1\B/g, (m, delim, code) => chalk.bold(code)),
                    ruleId: rule,
                    severity: (severity === 'error') ? 2 : 1,
                })),
            })),
    );
    return `lintdata:${json}`;
};

export = stylelintFormatter;