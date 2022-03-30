import path from 'path';
import chalk from 'chalk';
import type { ESLint } from 'eslint';

const eslintFormatter = (results: ESLint.LintResult[], data?: ESLint.LintResultData): string => {
    // count total errors and warnings
    const problems = results.reduce((t, { errorCount: e, warningCount: w }) => t + e + w, 0);
    // check for no errors and warnings
    if (problems === 0) return 'lintdata:[]';
    // transform results data and stringify
    const json = JSON.stringify(
        results
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
                }) => ({
                    line: (line != null && !Number.isNaN(line)) ? String(line) : '0',
                    column: (column != null && !Number.isNaN(column)) ? String(column) : '0',
                    message: message
                        // bold inline code strings
                        .replace(/\B([`'])(.*?)\1\B/g, (m, delim, code) => chalk.bold(code)),
                    ruleId,
                    severity: severity === 2 ? 2 : 1,
                })),
            })),
    );
    return `lintdata:${json}`;
};

export = eslintFormatter;