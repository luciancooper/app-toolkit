import CodeBlock from './CodeBlock';
import './RuntimeError.scss';

const RuntimeError = ({
    record: { error, isUnhandledRejection, stackFrames },
    highlighter,
    hidden = false,
}) => {
    let { name, message } = error;
    if (/^\w*:/.test(message)) {
        ({ 1: name, 2: message } = message.match(/^(\w+): *(.*)$/));
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
                    const { file, line, column } = src || compiled;
                    // determine location string
                    let loc = 'unknown',
                        code = null;
                    if (file && typeof line === 'number') {
                        loc = `${file.replace(/^webpack:\/{3}/, '')}:${line}`;
                        if (column) loc += `:${column}`;
                        // determine if src code block is available
                        if (highlighter.contains(file)) {
                            code = <CodeBlock loc={{ start: { line, column } }} source={highlighter.get(file)}/>;
                        }
                    }
                    // return stack frame element
                    return (
                        <div className='stack-frame'>
                            <div className='function'>{fn || '(anonymous function)'}</div>
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