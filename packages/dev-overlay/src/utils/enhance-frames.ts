import { SourceMapConsumer } from 'source-map';
import type { RawSourceMap } from 'source-map';
import type { StackFrameData, SourceHighlighter } from '../types';

/**
 * Returns an instance of SourceMapConsumer for a given files uri and contents
 * @param fileUri - The uri of the source file.
 * @param fileContents - The contents of the source file.
 */
async function getSourceMap(fileUri: string, fileContents: string): Promise<SourceMapConsumer> {
    const regex = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)\s*$/gm;
    let match = null;
    for (let next = regex.exec(fileContents); next != null; match = next, next = regex.exec(fileContents));
    if (!match?.[1]) {
        throw new Error(`Cannot find a source map directive for ${fileUri}.`);
    }
    let [, srcmap] = match;
    if (srcmap.startsWith('data:')) {
        const m = /^data:application\/json;(?:[\w=:"-]+;)*base64,/.exec(srcmap);
        if (!m) {
            throw new Error('Non-base64 inline source-map encoding is not supported.');
        }
        srcmap = Buffer.from(srcmap.substring(m[0]!.length), 'base64').toString('utf-8');
        return new SourceMapConsumer(JSON.parse(srcmap));
    }
    const url = fileUri.substring(0, fileUri.lastIndexOf('/') + 1) + srcmap,
        response = await fetch(url),
        data = (await response.json()) as RawSourceMap;
    return new SourceMapConsumer(data);
}

/**
 * Adds original positions to an array of stack frames where source maps are available
 * @param frames - An array of stack frames
 * @param highlighter - A source highlighter
 * @returns Enhanced stack frames
 */
export default async function enhanceFrames(
    frames: StackFrameData[],
    highlighter: SourceHighlighter,
): Promise<StackFrameData[]> {
    // create shallow copy of frames array
    const enhanced: StackFrameData[] = frames.slice(),
        // create array of unique src file paths
        compiledFiles: string[] = frames.map((f) => f.compiled.file)
            .filter((f, i, files) => (f && files.indexOf(f) === i));
    // for each unique file, fetch original source & source map
    await Promise.all(compiledFiles.map(async (filePath) => {
        if (filePath.startsWith('webpack-internal:')) {
            // TODO - set up route to serve webpack internal files
            return;
        }
        const response = await fetch(filePath),
            fileContent = await response.text();
        let srcMap: SourceMapConsumer;
        try {
            srcMap = await getSourceMap(filePath, fileContent);
        } catch (e) {
            return;
        }
        // modify each frame matching the file
        for (let i = 0; i < enhanced.length; i += 1) {
            const frame = enhanced[i]!,
                { file, line, column } = frame.compiled;
            if (file !== filePath || line == null || column == null) continue;
            // get the original code position
            const { source: srcFile, ...srcInfo } = srcMap.originalPositionFor({ line, column });
            // stop if src file cannot be determined
            if (!srcFile) continue;
            // determine if file is external
            const external = /\/(?:~|node_modules)\//.test(srcFile) || srcFile.trim().includes(' ');
            // store the mapped source file in lazy highlighter if path is not external
            if (!external) {
                highlighter.add(srcFile, () => srcMap.sourceContentFor(srcFile));
            }
            // enhance the frame
            enhanced[i] = {
                ...frame,
                src: { file: srcFile, ...srcInfo },
            };
        }
        // destroy the SourceMapConsumer instance
        srcMap.destroy();
    }));
    // return the enhanced frames
    return enhanced;
}