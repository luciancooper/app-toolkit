import type { Stats } from 'webpack';
import extract from './extract';
import format from './format';

export { extract, format };
export { default as tsError } from './tsError';

export type { TSIssue, TSErrorData } from './tsError';
export type { Location, Position } from './types';
export type { ErrorData, Extracted, LinterErrorData, LinterReport, ModuleNotFoundErrorData } from './extract';

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
export default function webpackMessages(stats: Stats) {
    return format(extract(stats));
}