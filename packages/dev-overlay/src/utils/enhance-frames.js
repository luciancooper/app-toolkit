import { SourceMapConsumer } from 'source-map';

/**
 * Returns an instance of SourceMapConsumer for a given files uri and contents
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
 * Adds original positions to an array of stack frames where source maps are available
 * @param {Object[]} frames - An array of stack frames
 * @param {LazyHighlighter} highlighter - Source highlighter instance
 * @returns {Object[]} - enhanced stack frames
 */
export default async function enhanceFrames(frames, highlighter) {
    // create shallow copy of frames array
    const enhanced = frames.slice(),
        // create array of unique src file paths
        compiledFiles = frames.reduce((acc, { compiled: { file } }) => {
            if (file && !acc.includes(file)) acc.push(file);
            return acc;
        }, []);
    // for each unique file, fetch original source & source map
    await Promise.all(compiledFiles.map(async (filePath) => {
        if (/^webpack-internal:/.test(filePath)) {
            // TODO - set up route to serve webpack internal files
            return;
        }
        const fileContent = await fetch(filePath).then((res) => res.text());
        let srcMap;
        try {
            srcMap = await getSourceMap(filePath, fileContent);
        } catch (e) {
            return;
        }
        // modify each frame matching the file
        for (let i = 0; i < enhanced.length; i += 1) {
            const frame = enhanced[i],
                { file, line, column } = frame.compiled;
            if (file !== filePath || line == null) continue;
            // get the original code position
            const { source: srcFile, ...srcInfo } = srcMap.originalPositionFor({ line, column });
            // stop if src file cannot be determined
            if (!srcFile) continue;
            // determine if file is external
            const external = /\/(?:~|node_modules)\//.test(srcFile) || srcFile.trim().indexOf(' ') !== -1;
            // store the mapped source file in lazy highlighter if path is not external
            if (!external) {
                highlighter.add(srcFile, () => srcMap.sourceContentFor(srcFile));
            }
            // enhance the frame
            enhanced[i] = {
                ...frame,
                src: { file: srcFile, external, ...srcInfo },
            };
        }
        // destroy the SourceMapConsumer instance
        srcMap.destroy();
    }));
    // return the enhanced frames
    return enhanced;
}