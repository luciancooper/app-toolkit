import type { ErrorData, TSErrorData } from '@lcooper/webpack-messages';

export interface Location {
    file: string
    line: number | null
    column: number | null
}

export interface SourceLocation extends Location {
    name: string | null
}

export interface StackFrameData {
    fn: string | null
    compiled: Location
    src?: SourceLocation
}

export interface RuntimeErrorRecord {
    error: Error
    isUnhandledRejection: boolean
    stackFrames: StackFrameData[]
}

export interface SourceHighlighter {
    get: (address: string) => string | null
    add: (address: string, rawSource: string | (() => string | null)) => void
}

export interface CompilationStatus {
    hash: string | null
    compiling: boolean
    awaitingTypeCheck: boolean
    time?: number
    name?: string
    errors?: ErrorData[]
    warnings?: ErrorData[]
    tsc?: { errors: TSErrorData[], warnings: TSErrorData[] }
    fileMap?: Record<string, string>
}

export interface Overlay {
    renderCompileErrors: (errors: ErrorData[], highlighter: SourceHighlighter) => boolean
    renderCompileWarnings: (warnings: ErrorData[], highlighter: SourceHighlighter) => boolean
    renderRuntimeErrors: (errors: RuntimeErrorRecord[], highlighter: SourceHighlighter) => boolean
    setClearCallback: (callback: (() => void)) => void
    setMinimizeCallback: (callback: (() => void)) => void
}