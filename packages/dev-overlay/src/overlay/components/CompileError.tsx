import type { ErrorData, LinterErrorData, TSErrorData } from '@lcooper/webpack-messages';
import ansiHtml from '../utils/ansi-html';
import CodeBlock from './CodeBlock';
import './CompileError.scss';

interface BadgeProps {
    type: 'error' | 'warning'
}

const Badge = ({ type }: BadgeProps) => (
    <span className={['type-badge', type]}>{type.toUpperCase()}</span>
);

interface CompileErrorProps<T> {
    level: 'error' | 'warning'
    source: string | null
    error: T
}

const LintingErrors = ({ level, error: { linters } }: CompileErrorProps<LinterErrorData>) => (
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
    error: {
        severity,
        code,
        message,
        relativeFile,
        location,
    },
    source,
}: CompileErrorProps<TSErrorData>) => (
    <div className='compile-error typescript'>
        <header>
            <Badge type={severity}/>
            {location ? (
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
            )}
        </header>
        <div>
            <span className='code'>{`${code}:`}</span>
            <span className='message'>{message}</span>
        </div>
        {(location && source) ? (
            <CodeBlock loc={location} source={source}/>
        ) : null}
    </div>
);

const CompileError = ({ level, error, source }: CompileErrorProps<ErrorData>) => {
    switch (error.type) {
        // module not found error
        case 'module-not-found-error':
            return (
                <div className='compile-error module-not-found'>
                    <header>
                        <Badge type={level}/>
                        <b>Module Not Found</b>
                    </header>
                    {error.files.length > 1 ? (
                        <>
                            <div>
                                {"Can't resolve "}
                                <var className='module'>{error.module}</var>
                                {' in:'}
                            </div>
                            <ul>
                                {error.files.map((file) => <li><var className='file'>{file}</var></li>)}
                            </ul>
                        </>
                    ) : (
                        <div>
                            {"Can't resolve "}
                            <var className='module'>{error.module}</var>
                            {' in '}
                            <var className='file'>{error.files[0]}</var>
                        </div>
                    )}
                </div>
            );
        // linting errors
        case 'lint-errors':
            return (
                <div className='compile-error'>
                    <LintingErrors level={level} error={error} source={source}/>
                </div>
            );
        // typescript errors
        case 'tsc':
            return <TypeScriptError level={level} error={error} source={source}/>;
        // all other error types
        default:
            return (
                <div className='compile-error'>
                    <header>
                        <Badge type={level}/>
                        {'in '}
                        <b>{error.file}</b>
                    </header>
                    <pre
                        className='error-message'
                        innerHTML={ansiHtml(error.message)}
                    />
                </div>
            );
    }
};

export default CompileError;