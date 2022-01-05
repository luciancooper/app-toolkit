import jsTokens from 'js-tokens';
import './CodeBlock.scss';

const keywords = [
    'break',
    'case',
    'catch',
    'continue',
    'debugger',
    'default',
    'do',
    'else',
    'finally',
    'for',
    'function',
    'if',
    'return',
    'switch',
    'throw',
    'try',
    'var',
    'const',
    'while',
    'with',
    'new',
    'this',
    'super',
    'class',
    'extends',
    'export',
    'import',
    'null',
    'true',
    'false',
    'in',
    'instanceof',
    'typeof',
    'void',
    'delete',
    'await',
    'enum',
];

function getTokenType({ type, value }) {
    switch (type) {
        case 'StringLiteral':
            return 'string';
        case 'RegularExpressionLiteral':
            return 'regexp';
        case 'MultiLineComment':
        case 'SingleLineComment':
            return 'comment';
        case 'NumericLiteral':
            return 'number';
        case 'Punctuator':
            return /^[()[\]{};.,]$/.test(value) ? 'punctuator' : 'operator';
        case 'IdentifierName':
            return keywords.includes(value) ? 'keyword' : 'identifier';
        case 'Invalid':
            return (value === '@' || value === '#') ? 'punctuator' : 'invalid';
        case 'JSXString':
            return 'string';
        case 'JSXText':
            return null;
        case 'JSXPunctuator':
            return /^[<>/]$/.test(value) ? 'jsx_tag' : /^[{}.]$/.test(value) ? 'punctuator' : 'operator';
        case 'JSXIdentifier':
            return 'jsx_id';
        case 'JSXInvalid':
            return (value === '@' || value === '#') ? 'punctuator' : 'invalid';
        default:
            return null;
    }
}

/**
 * Highlight js code block.
 * @param {string} code - js code block
 * @returns {string} - highlighted js code block
 */
function highlight(code) {
    return Array.from(jsTokens(code, { jsx: true })).map((token) => {
        const type = getTokenType(token);
        if (type) {
            return token.value
                .split(/\r\n/)
                .map((str) => `<span class='${type}'>${str}</span>`)
                .join('\n');
        }
        return token.value;
    }).join('');
}

const CodeBlock = ({ start, source, line }) => {
    const lines = highlight(source).split('\n');
    return (
        <pre className='code-block'>
            {lines.map((l, i) => (
                <li line={i + start} highlighted={i + start === line} innerHTML={l}/>
            ))}
        </pre>
    );
};

export default CodeBlock;