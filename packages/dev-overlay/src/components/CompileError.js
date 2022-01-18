import ansiHtml from '../utils/ansi-html';
import './CompileError.scss';

const Badge = ({ type }) => (
    <span className={`type-badge ${type}`}>{type.toUpperCase()}</span>
);

const LintingErrors = ({ level, linters }) => (
    <table className='linting-table'>
        {linters.map(({ linter, files }) => {
            // create summary
            const problems = files.flatMap(({ messages }) => messages.map(({ severity }) => severity)),
                errorCount = problems.filter((s) => s === 2).length,
                warningCount = problems.length - errorCount,
                countSummary = [
                    errorCount ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : null,
                    warningCount ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : null,
                ].filter(Boolean).join(' and '),
                summary = ` found ${countSummary} in ${files.length} file${files.length > 1 ? 's' : ''}`;
            return (
                <>
                    <tr className='lint-summary'>
                        <td colSpan={5}>
                            <Badge type={level}/>
                            <span className='linter-name'>{linter}</span>
                            {summary}
                        </td>
                    </tr>
                    {files.map(({ filePath, messages }) => (
                        <>
                            <tr className='lint-filepath'>
                                <td colSpan={5} className='file'>{filePath}</td>
                            </tr>
                            {messages.map(({
                                line,
                                column,
                                message,
                                ruleId,
                                severity,
                            }) => (
                                <tr className='lint-message'>
                                    {(severity === 2) ? (
                                        <td className='message-error'>✖</td>
                                    ) : (
                                        <td className='message-warning'>⚠</td>
                                    )}
                                    <td className='loc-line'>{line}</td>
                                    <td className='loc-column'>{column}</td>
                                    <td className='message' innerHTML={ansiHtml(message)}/>
                                    <td className='rule-id'>{ruleId}</td>
                                </tr>
                            ))}
                        </>
                    ))}
                </>
            );
        })}
    </table>
);

const TypeScriptError = ({
    severity,
    code,
    message,
    relativeFile,
    location,
}) => {
    const loc = location ? (
        <span className='location'>
            <span className='file'>{relativeFile}</span>
            :
            <span className='file-loc'>{location.start.line}</span>
            :
            <span className='file-loc'>{location.start.column}</span>
        </span>
    ) : (
        <span className='location'>
            <span className='file'>{relativeFile}</span>
        </span>
    );
    return (
        <div className='compile-error typescript'>
            <header>
                <Badge type={severity}/>
                {loc}
            </header>
            <div>
                <span className='code'>{`${code}:`}</span>
                <span className='message'>{message}</span>
            </div>
        </div>
    );
};

const CompileError = ({ level, type, ...data }) => {
    switch (type) {
        // module not found error
        case 'module-not-found-error':
            return (
                <div className='compile-error module-not-found'>
                    <header>
                        <Badge type={level}/>
                        <b>Module Not Found</b>
                    </header>
                    {data.files.length > 1 ? (
                        <>
                            <div>
                                {"Can't resolve "}
                                <var className='module'>{data.module}</var>
                                {' in:'}
                            </div>
                            <ul>
                                {data.files.map((file) => <li><var className='file'>{file}</var></li>)}
                            </ul>
                        </>
                    ) : (
                        <div>
                            {"Can't resolve "}
                            <var className='module'>{data.module}</var>
                            {' in '}
                            <var className='file'>{data.files[0]}</var>
                        </div>
                    )}
                </div>
            );
        // linting errors
        case 'lint-errors':
            return (
                <div className='compile-error'>
                    <LintingErrors level={level} {...data}/>
                </div>
            );
        // typescript errors
        case 'tsc':
            return <TypeScriptError {...data}/>;
        // all other error types
        default:
            return (
                <div className='compile-error'>
                    <header>
                        <Badge type={level}/>
                        {'in '}
                        <b>{data.file}</b>
                    </header>
                    <pre
                        className='error-message'
                        innerHTML={ansiHtml(data.message)}
                    />
                    <div className='origin-trace'>
                        {data.origin.map(({ id, loc = [] }) => (
                            <div>
                                <var>{id}</var>
                                <i>{loc.map((l) => ` ${l}`).join('')}</i>
                            </div>
                        ))}
                    </div>
                </div>
            );
    }
};

export default CompileError;