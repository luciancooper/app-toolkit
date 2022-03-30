import CodeBlock from './CodeBlock';
import type { RuntimeErrorRecord, SourceHighlighter } from '../../types';
import './RuntimeError.scss';

interface Props {
    record: RuntimeErrorRecord
    highlighter: SourceHighlighter
    hidden?: boolean
}

const RuntimeError = ({
    record: { error, isUnhandledRejection, stackFrames },
    highlighter,
    hidden = false,
}: Props) => {
    let { name, message } = error;
    if (/^\w*:/.test(message)) {
        const m = /^(\w+): *(.*)$/.exec(message)!;
        [name, message] = [m[1]!, m[2]!];
    } else {
        name = isUnhandledRejection ? `Unhandled Rejection (${name})` : name;
    }
    return (
        <div className='runtime-error' style={(hidden ? { display: 'none' } : {})}>
            <header>
                <div className='error-name'>{name}</div>
                <div className='error-message'>{message}</div>
            </header>
            <div className='stack-trace'>
                {stackFrames.map(({ fn, compiled, src }) => {
                    const { file, line, column } = src ?? compiled;
                    // determine location string
                    let loc = 'unknown',
                        code = null;
                    if (file && typeof line === 'number') {
                        loc = `${file.replace(/^webpack:\/{3}/, '')}:${line}`;
                        if (column) loc += `:${column}`;
                        // determine if src code block is available
                        const source = highlighter.get(file);
                        if (source) {
                            const start = { line, column: column ?? undefined };
                            code = <CodeBlock loc={{ start }} source={source}/>;
                        }
                    }
                    // return stack frame element
                    return (
                        <div className='stack-frame'>
                            <div className='function'>{fn ?? '(anonymous function)'}</div>
                            <div className='location'>{loc}</div>
                            {code}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RuntimeError;