import { SourceMapConsumer } from 'source-map';

/**
 * Returns an insance of SourceMapConsumer for a given files uri and contents
 * @param {string} fileUri - The uri of the source file.
 * @param {string} fileContents - The contents of the source file.
 * @returns {SourceMapConsumer}
 */
async function getSourceMap(fileUri, fileContents) {
    const regex = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)\s*$/gm;
    let match = null;
    for (let next = regex.exec(fileContents); next != null; match = next, next = regex.exec(fileContents));
    if (!(match && match[1])) {
        throw new Error(`Cannot find a source map directive for ${fileUri}.`);
    }
    let [, srcmap] = match;
    if (srcmap.startsWith('data:')) {
        const m = srcmap.match(/^data:application\/json;(?:[\w=:"-]+;)*base64,/);
        if (!m) {
            throw new Error('Non-base64 inline source-map encoding is not supported.');
        }
        srcmap = window.atob(srcmap.substring(m[0].length));
        return new SourceMapConsumer(JSON.parse(srcmap));
    }
    const url = fileUri.substring(0, fileUri.lastIndexOf('/') + 1) + srcmap,
        data = await fetch(url).then((res) => res.json());
    return new SourceMapConsumer(data);
}

/**
 * Extract context lines from a source file str given a target line number
 * @param {string} src - The source code
 * @param {number} line - The line number to provide context around
 * @param {number} count - The number of lines of context
 * @returns {Array[]}
 */
function getContextLines(src, line, count) {
    const start = Math.max(0, line - 1 - count);
    return src
        .split('\n')
        .slice(start, line + count)
        .map((l, i) => [i + start + 1, l, i + start === line - 1]);
}

/**
 * Adds original positions to an array of stack frames where source maps are available
 * @param {Object[]} frames - An array of stack frames
 * @param {number} [contextLines=3] - The number of lines of context to provide
 * @returns {Object[]} - enhanced stack frames
 */
export default async function enhanceFrames(frames, contextLines = 3) {
    // create shallow copy of frames array
    const enhanced = frames.slice(),
        // create array of unique src file paths
        files = frames.reduce((acc, { file }) => {
            if (file && !acc.includes(file)) {
                acc.push(file);
            }
            return acc;
        }, []);
    // for each unique file, fetch original source & source map
    await Promise.all(files.map(async (filePath) => {
        if (/^webpack-internal:/.test(filePath)) {
            // TODO - set up route to serve webpack internal files
            return;
        }
        const src = await fetch(filePath).then((res) => res.text());
        let srcMap;
        try {
            srcMap = await getSourceMap(filePath, src);
        } catch (e) {
            return;
        }
        // end if src map could not be created
        if (srcMap == null) return;
        // modify each frame matching the file
        enhanced.forEach((frame, i) => {
            const { file, line, column } = frame;
            if (file !== filePath || line == null) return;
            // get the original code position
            const { line: l, column: c, source } = srcMap.originalPositionFor({ line, column }),
                // get the original source content
                sourceContent = source && srcMap.sourceContentFor(source);
            // enhance the frame
            enhanced[i] = {
                ...frame,
                src: {
                    file: source,
                    line: l,
                    column: c,
                    context: sourceContent ? getContextLines(sourceContent, l, contextLines) : [],
                },
            };
        });
        // destroy the SourceMapConsumer instance
        srcMap.destroy();
    }));
    // return the enhanced frames
    return enhanced;
}