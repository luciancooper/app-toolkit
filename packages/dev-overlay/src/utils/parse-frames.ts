import type { StackFrameData } from '../types';

/**
 * Extract and parse the stack trace from an error
 * @param error - Error to parse stack trace from
 * @returns An array of parsed stack frames
 */
export default function parseFrames({ stack }: Error): StackFrameData[] {
    if (!stack || typeof stack !== 'string') {
        throw new Error('error stack is not a string');
    }
    return stack
        .split('\n')
        .filter((l) => (
            /^\s*(?:at|in)\s.+:\d+/.test(l) || /(?:^|@)\S+:\d+|.+line\s+\d+\s+>\s+(?:eval|Function).+/.test(l)
        ))
        .map((l) => {
            let line = l,
                fn: string | null,
                last: string | undefined;
            if (/(?:^|@)\S+:\d+|.+line\s+\d+\s+>\s+(?:eval|Function).+/.test(line)) {
                // strip eval
                const isEval = / > (eval|Function)/.test(line);
                if (isEval) line = line.replace(/ line (\d+)(?: > eval line \d+)* > (eval|Function):\d+:\d+/g, ':$1');
                const data = line.split(/[@]/g);
                last = data.pop();
                fn = data.join('@') || (isEval ? 'eval' : null);
            } else {
                // strip eval
                if (line.includes('(eval ')) line = line.replace(/\(eval at [^()]*|\),.*$/g, '');
                const data = line.replace(/\(at /, '(').trim().split(/\s+/g).slice(1);
                last = data.pop();
                fn = data.join(' ') || null;
            }
            if (fn) fn = fn.replace(/^Object\./, '');
            if (!fn || ['friendlySyntaxErrorLabel', 'exports.__esModule', '<anonymous>'].includes(fn)) {
                fn = null;
            }
            // extract location
            const loc = /\(?(.+?)(?::(\d+))?(?::(\d+))?\)?$/.exec(last!)!;
            return {
                fn,
                compiled: {
                    file: loc[1]!,
                    line: loc[2] ? Number(loc[2]) : null,
                    column: loc[3] ? Number(loc[3]) : null,
                },
            };
        });
}