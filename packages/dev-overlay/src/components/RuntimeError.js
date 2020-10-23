import CodeBlock from './CodeBlock';
import './RuntimeError.scss';

function StackFrame({ fn, compiled, src }) {
    const { file, loc: [line, col], ctx } = src || compiled;
    // determine location string
    let loc,
        code;
    if (file && typeof line === 'number') {
        loc = `${file.replace(/^webpack:\/{3}/, '')}:${line}`;
        if (col) loc += `:${col}`;
    } else {
        loc = 'unknown';
    }
    // determine if file location is internal
    const isInternal = !file || /\/(?:~|node_modules)\//.test(file) || file.trim().indexOf(' ') !== -1;
    // create code block if context exists and location is not an internal file
    if (ctx && !isInternal) {
        code = <CodeBlock line={line} {...ctx}/>;
    }
    // return stack frame element
    return (
        <div className='stack-frame'>
            <div className='function'>{fn || '(anonymous function)'}</div>
            <div className='location'>{loc}</div>
            {code}
        </div>
    );
}

export default function RuntimeError({
    record: { error, isUnhandledRejection, stackFrames },
    hidden = false,
}) {
    let { name, message } = error;
    if (/^\w*:/.test(message)) {
        ({ 1: name, 2: message } = message.match(/^(\w+): *(.*)$/));
    } else {
        name = isUnhandledRejection
            ? `Unhandled Rejection (${name})`
            : name;
    }
    return (
        <div className='runtime-error' style={(hidden ? { display: 'none' } : {})}>
            <header>
                <div className='error-name'>{name}</div>
                <div className='error-message'>{message}</div>
            </header>
            <div className='stack-trace'>
                {stackFrames.map((frame) => <StackFrame {...frame}/>)}
            </div>
        </div>
    );
}