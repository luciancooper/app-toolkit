import './CodeBlock.scss';

export default function CodeBlock({ start, source, line }) {
    const lines = source.split('\n');
    return (
        <pre className='code-block'>
            {
                lines.map((l, i) => (
                    <li line={i + start} highlighted={i + start === line}>{l}</li>
                ))
            }
        </pre>
    );
}