// Type definitions for @lcooper/webpack-messages
// Project: https://github.com/luciancooper/app-toolkit
// Definitions by: Lucian Cooper <https://github.com/luciancooper>

import type { Stats } from 'webpack';

export interface LinterErrorMessage {
    line: string
    column: string
    message: string
    ruleId: string
    severity: 1 | 2
}

export interface LinterFileReport {
    filePath: string
    messages: LinterErrorMessage[]
}

export interface LinterErrorReport {
    linter: 'ESLint' | 'Stylelint'
    files: LinterFileReport[]
}

interface TSIssuePosition {
    line: number
    column: number
}

interface TSIssueLocation {
    start: TSIssuePosition
    end: TSIssuePosition
}

interface TSIssue {
    origin: 'typescript' | 'eslint'
    severity: 'error' | 'warning'
    code: string
    message: string
    file?: string
    location?: TSIssueLocation
}

export interface TSErrorData extends TSIssue {
    type: 'tsc'
    relativeFile?: string
}

/**
 * Create a TypeScript error data object from a TypeScript issue
 *
 * @param issue - A TypeScript issue object
 * @returns TypeScript error data
 */
export function tsError(issue: TSIssue): TSErrorData;

export type ErrorData = {
    type?: 'syntax-error'
    file: string
    message: string
    origin: { id: string, loc?: string[] }[]
} | {
    type: 'module-not-found-error'
    module: string
    files: string[]
} | {
    type: 'lint-errors'
    linters: LinterErrorReport[]
} | TSIErrorData

export interface MessageData {
    errors: ErrorData[]
    warnings: ErrorData[]
}

/**
 * Extract error / warning data from a webpack stats object.
 *
 * @param stats - A webpack stats object
 * @returns Extracted error and warning data
 */
export function extract(stats: Stats): MessageData;

export interface Messages {
    errors: string[]
    warnings: string[]
}

/**
 * Transform error / warning data into formatted readable output strings.
 * 
 * @param extracted - Extracted error / warning data from `extract(stats)`.
 * @returns Formatted error and warning messages
 */
export function format(extracted: MessageData): Messages;

/**
 * Extract and format webpack error / warning messages
 * 
 * @remarks
 * Under the hood, this method simply calls `extract` and then `format`
 * 
 * @example
 * ```ts
 * import webpackMessages from '@lcooper/webpack-messages';
 * 
 * const { errors, warnings } = webpackMessages(stats);
 *
 * if (errors.length) {
 *     console.log('Failed to compile.');
 *     console.log(errors.join(''));
 * } else if (warnings.length) {
 *     console.log('Compiled with warnings.');
 *     console.log(warnings.join(''));
 * } else {
 *     console.log('Compiled successfully');
 * }
 * ```
 * 
 * @param stats - A webpack stats object
 * @returns Formatted error and warning messages
 */
export default function webpackMessages(stats: Stats): Messages;