import path from 'path';
import type { Location } from './types';

export interface TSIssue {
    origin: 'typescript' | 'eslint'
    severity: 'error' | 'warning'
    code: string
    message: string
    file?: string
    location?: Location
}

export interface TSErrorData extends TSIssue {
    type: 'tsc'
    relativeFile?: string
}

/**
 * Create a TypeScript error data object from a TypeScript issue
 * @param issue - A TypeScript issue
 * @returns TypeScript error data
 */
export default function tsError(issue: TSIssue): TSErrorData {
    const relativeFile = issue.file && path.relative(process.cwd(), issue.file);
    return {
        type: 'tsc',
        ...issue,
        relativeFile,
    };
}