import './CodeBlock.scss';

const CodeBlock = ({
    loc,
    source,
    linesAbove = 3,
    linesBelow = 3,
}) => {
    const sourceLines = source.split('\n'),
        { line: l1, column: c1 } = { line: -1, column: 0, ...loc.start },
        { line: l2, column: c2 } = { line: l1, column: c1, ...loc.end },
        start = Math.max(l1 - linesAbove, 1),
        end = Math.min(l2 + linesBelow, sourceLines.length);
    return (
        <pre className='code-block'>
            {sourceLines.slice(start - 1, end).map((line, index) => {
                const ln = start + index,
                    marked = ln >= l1 && ln <= l2;
                let marker = null;
                if (marked && (l1 < l2 ? c1 : (c1 !== c2 || c1))) {
                    const raw = line
                            .replace(/(?:<span(?: class='[a-z-]+')>|<\/span>)/g, '')
                            .replace(/&gt;/g, '>')
                            .replace(/&lt;/g, '<'),
                        [idx, len] = l1 === l2 ? [c1, Math.max(c2 - c1, 1)]
                            : ln === l1 ? [c1, raw.length - c1 + 1] : [0, ln === l2 ? c2 : raw.length];
                    marker = (
                        <span className='marker'>
                            {raw.slice(0, Math.max(idx - 1, 0)).replace(/[^\t]/g, ' ')}
                            <span>{' '.repeat(len || 1)}</span>
                        </span>
                    );
                }
                return (
                    <li line={ln} className={marked ? 'marked' : null}>
                        {marker}
                        <code innerHTML={line}/>
                    </li>
                );
            })}
        </pre>
    );
};

export default CodeBlock;