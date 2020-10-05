/**
 * Extract and parse the stack trace from an error
 * @param {Error} error - error object
 * @returns {Object[]} - array of stack frame objects
 */
export default function parseFrames({ stack }) {
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
                fn,
                last;
            if (/(?:^|@)\S+:\d+|.+line\s+\d+\s+>\s+(?:eval|Function).+/.test(line)) {
                // strip eval
                const isEval = / > (eval|Function)/.test(line);
                if (isEval) line = line.replace(/ line (\d+)(?: > eval line \d+)* > (eval|Function):\d+:\d+/g, ':$1');
                const data = line.split(/[@]/g);
                last = data.pop();
                fn = data.join('@') || (isEval ? 'eval' : null);
            } else {
                // strip eval
                if (line.indexOf('(eval ') !== -1) line = line.replace(/\(eval at [^()]*|\),.*$/g, '');
                const data = line.replace(/\(at /, '(').trim().split(/\s+/g).slice(1);
                last = data.pop();
                fn = data.join(' ') || null;
            }
            if (fn) fn = fn.replace(/^Object\./, '');
            if (!fn || ['friendlySyntaxErrorLabel', 'exports.__esModule', '<anonymous>'].includes(fn)) {
                fn = null;
            }
            // extract location
            const { 1: file, 2: ln, 3: cn } = last.match(/\(?(.+?)(?::(\d+))?(?::(\d+))?\)?$/);
            return {
                fn,
                file,
                line: ln ? Number(ln) : ln,
                column: cn ? Number(cn) : cn,
            };
        });
}