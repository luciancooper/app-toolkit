import CodeBlock from './CodeBlock';
import './RuntimeError.scss';

function StackFrame({ fn, compiled, src }) {
    const { file, loc: [line, col], ctx } = src || compiled;
    // determine location string
    let loc;
    if (file && typeof line === 'number') {
        loc = file
            .replace(/^[/|\\].*?[/|\\]((?:src|node_modules)[/|\\].*)/, '$1')
            .replace('webpack://', '.');
        loc += `:${line}`;
        if (col) loc += `:${col}`;
    } else {
        loc = 'unknown';
    }
    // return stack frame element
    return (
        <div className='stack-frame'>
            <div className='function'>{fn || '(anonymous function)'}</div>
            <div className='location'>{loc}</div>
            {ctx && <CodeBlock line={line} {...ctx}/>}
        </div>
    );
}

export default function RuntimeError({ error, isUnhandledRejection, stackFrames }) {
    let { name, message } = error;
    if (/^\w*:/.test(message)) {
        ({ 1: name, 2: message } = message.match(/^(\w+): *(.*)$/));
    } else {
        name = isUnhandledRejection
            ? `Unhandled Rejection (${name})`
            : name;
    }
    return (
        <div className='runtime-error'>
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