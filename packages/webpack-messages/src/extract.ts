import type { Compilation, Stats, WebpackError } from 'webpack';
import type { Severity } from './types';
import tsError, { TSIssue, TSErrorData } from './tsError';

export interface ExtractedErrorData {
    name: string
    file: string
    readableId: string
    message: string
    webpackError: WebpackError
    error: Error
}

/**
 * Recursively extract errors / warnings from a webpack compilation
 * @param compilation - webpack compilation
 * @param group - severity group
 * @returns extracted webpack errors
 */
function recursiveExtract(compilation: Compilation, group: 'errors' | 'warnings'): WebpackError[] {
    const { [group]: items } = compilation;
    if (items.length === 0 && compilation.children) {
        return compilation.children.flatMap((child) => recursiveExtract(child, group));
    }
    return items;
}

type NestedError = Error & { [key in Severity]: NestedError | null };

/**
 * Extract and process errors / warnings from a webpack compilation
 * @param compilation - webpack compilation
 * @param group - severity group
 */
function extractFromCompilation(compilation: Compilation, group: 'errors' | 'warnings'): ExtractedErrorData[] {
    const webpackErrors = recursiveExtract(compilation, group),
        extracted: ExtractedErrorData[] = [];
    // loop over extracted webpack errors
    for (const webpackError of webpackErrors) {
        const { message, name } = webpackError,
            originalKey: Severity = name === 'ModuleWarning' ? 'warning' : 'error';
        // extract original error
        let originalError = webpackError as unknown as NestedError;
        while (originalError[originalKey]) {
            originalError = originalError[originalKey]!;
        }
        // get readable id
        const readableId = webpackError.module?.readableIdentifier(compilation.requestShortener) ?? 'unknown';
        // yield error data
        extracted.push({
            name,
            file: webpackError.file,
            readableId,
            message,
            webpackError,
            error: originalError as Error,
        });
    }
    return extracted;
}

type ErrorFilter = (data: ExtractedErrorData) => boolean;

const isEslintError: ErrorFilter = ({ error: { name, message } }) => (
    name === 'ESLintError' && /^\s*lintdata:/.test(message)
);

const isStylelintError: ErrorFilter = ({ name, message }) => (
    name === 'StylelintError' && /^\s*lintdata:/.test(message)
);

const isTypescriptError: ErrorFilter = ({ webpackError }) => {
    const hasIssue = !!(webpackError as WebpackError & { issue?: any }).issue;
    return hasIssue && (webpackError.constructor.name === 'IssueWebpackError');
};

const isModuleNotFoundError: ErrorFilter = ({ name, message, webpackError }) => (
    name === 'ModuleNotFoundError' && message.startsWith('Module not found')
);

const isSyntaxError: ErrorFilter = ({ name, error }) => (
    name === 'ModuleBuildError' && (error.name === 'SyntaxError' || error.name === 'SassError')
);

function filterChain<T>(errors: T[], filters: ((arg: T) => boolean)[]): T[][] {
    const chain: T[][] = [];
    chain.push(
        filters.reduce<T[]>((errs, filter) => {
            const matched: T[] = [];
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

export interface ModuleNotFoundErrorData {
    type: 'module-not-found-error'
    module: string
    files: string[]
}

/**
 * Transform module not found errors
 * @param errors - extracted error data objects
 * @returns transformed module not found error objects
 */
function* transformModuleNotFoundErrors(errors: ExtractedErrorData[]): Generator<ModuleNotFoundErrorData> {
    if (errors.length === 0) return [];
    // extract module name & error file from each error
    const data = errors.map(({
        error,
        file,
        readableId,
        webpackError,
    }) => {
        const match = /Can't resolve '([^']+)' in '([^']+)'/.exec(error.message);
        return match ? {
            file: match[2]!,
            module: match[1]!,
        } : {
            file,
            module: (webpackError.loc as { name?: string }).name ?? readableId,
        };
    });
    // create set of unique modules
    let modules = [...new Set(data.map(({ module }) => module))];
    // sort dependencies before relative import modules
    modules = [
        ...modules.filter((module) => !/^\.{1,2}\//.test(module)),
        ...modules.filter((module) => /^\.{1,2}\//.test(module)),
    ];
    // create an error data object for each missing module
    for (const module of modules) {
        const files = data
            .filter(({ module: m, file }) => (m === module && file))
            .map(({ file }) => file);
        yield {
            type: 'module-not-found-error',
            module,
            files,
        };
    }
}

interface LinterErrorMessage {
    line: string
    column: string
    message: string
    ruleId: string
    severity: 1 | 2
}

interface LinterFileReport {
    filePath: string
    messages: LinterErrorMessage[]
}

export interface LinterReport {
    linter: 'ESLint' | 'Stylelint'
    files: LinterFileReport[]
}

export interface LinterErrorData {
    type: 'lint-errors'
    linters: LinterReport[]
}

/**
 * Transform linting errors into a single grouped object
 * @param eslintErrors - eslint error data objects
 * @param stylelintErrors - stylelint error data objects
 * @returns a single grouped linting error
 */
function* groupLintErrors(
    eslintErrors: ExtractedErrorData[],
    stylelintErrors: ExtractedErrorData[],
): Generator<LinterErrorData> {
    const linters: LinterReport[] = [];
    // create eslint report
    if (eslintErrors.length) {
        linters.push({
            linter: 'ESLint',
            files: eslintErrors.flatMap<LinterFileReport>(({ error: { message } }) => (
                JSON.parse(message.trim().replace(/^lintdata:/, '')) as LinterFileReport[]
            )),
        });
    }
    // create stylelint report
    if (stylelintErrors.length) {
        linters.push({
            linter: 'Stylelint',
            files: stylelintErrors.flatMap(({ message }) => (
                JSON.parse(message.trim().replace(/^lintdata:/, '')) as LinterFileReport[]
            )),
        });
    }
    if (linters.length) {
        yield { type: 'lint-errors', linters };
    }
}

export type ErrorData = {
    type?: 'syntax-error'
    file: string
    message: string
} | ModuleNotFoundErrorData | LinterErrorData | TSErrorData;

/**
 * Transform extracted error data
 * @param errors - extracted error data
 * @returns transformed error data
 */
function* transformErrors(errors: ExtractedErrorData[]): Generator<ErrorData> {
    // group extracted errors into category types
    const [
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
    // transform syntax errors
    for (const { file, error } of syntaxErrors!) {
        yield {
            type: 'syntax-error',
            file,
            // clean up the original error message
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            message: error.toString()
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
        };
    }
    // transform module not found errors
    yield* transformModuleNotFoundErrors(moduleNotFoundErrors!);
    // transform linting errors
    yield* groupLintErrors(eslintErrors!, stylelintErrors!);
    // transform typescript errors
    for (const { webpackError } of typescriptErrors!) {
        yield tsError((webpackError as unknown as { issue: TSIssue }).issue);
    }
    // transform uncategorized errors
    for (const { file, message } of uncategorized!) {
        yield {
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
        };
    }
}

export interface Extracted {
    errors: ErrorData[]
    warnings: ErrorData[]
}

/**
 * Extract error / warning data from a webpack stats object
 * @param stats - webpack stats object
 * @returns extracted error & warning data
 */
export default function extract(stats: Stats): Extracted {
    let errors: ErrorData[] = [],
        warnings: ErrorData[] = [];
    // check for errors or warnings
    if (stats.hasErrors()) {
        const extracted = extractFromCompilation(stats.compilation, 'errors');
        errors = [...transformErrors(extracted)];
    } else if (stats.hasWarnings()) {
        const extracted = extractFromCompilation(stats.compilation, 'warnings');
        warnings = [...transformErrors(extracted)];
    }
    return {
        errors,
        warnings,
    };
}