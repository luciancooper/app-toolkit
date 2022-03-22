import jsTokens from 'js-tokens';

const keywords = new Set([
    'break', 'case', 'catch', 'continue', 'debugger', 'default', 'do', 'else', 'finally', 'for', 'function', 'if',
    'return', 'switch', 'throw', 'try', 'var', 'const', 'while', 'with', 'new', 'this', 'super', 'class', 'extends',
    'export', 'import', 'null', 'true', 'false', 'in', 'instanceof', 'typeof', 'void', 'delete',
    // reserved words
    'await', 'enum',
    // strict reserved words
    'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield', 'type',
    // sometimes keywords
    'as', 'async', 'from', 'get', 'of', 'set',
]);

function* tokenize(source) {
    for (const { type, value } of jsTokens(source, { jsx: true })) {
        switch (type) {
            case 'TemplateHead':
                yield { type: 'string', value: value.slice(0, -2) };
                yield { type: 'punctuator', value: '${' };
                break;
            case 'TemplateMiddle':
                yield { type: 'punctuator', value: '}' };
                yield { type: 'string', value: value.slice(1, -2) };
                yield { type: 'punctuator', value: '${' };
                break;
            case 'TemplateTail':
                yield { type: 'punctuator', value: '}' };
                yield { type: 'string', value: value.slice(1) };
                break;
            case 'IdentifierName':
                yield {
                    type: keywords.has(value) ? 'keyword' : 'identifier',
                    value,
                };
                break;
            case 'NumericLiteral':
                yield { type: 'number', value };
                break;
            case 'StringLiteral':
            case 'JSXString':
            case 'NoSubstitutionTemplate':
                yield { type: 'string', value };
                break;
            case 'RegularExpressionLiteral':
                yield { type: 'regex', value };
                break;
            case 'Punctuator':
                yield {
                    type: /^[()[\]{};.,]$/.test(value) ? 'punctuator' : 'operator',
                    value,
                };
                break;
            case 'JSXPunctuator':
                yield {
                    // type: 'punctuator',
                    type: /^[<>/]$/.test(value) ? 'jsx-tag' : /^[{}.]$/.test(value) ? 'punctuator' : 'operator',
                    value,
                };
                break;
            case 'MultiLineComment':
            case 'SingleLineComment':
                yield { type: 'comment', value };
                break;
            case 'Invalid':
            case 'JSXInvalid':
                yield {
                    type: (value === '@' || value === '#') ? 'punctuator' : 'invalid',
                    value,
                };
                break;
            case 'JSXIdentifier':
                yield { type: 'jsx-id', value };
                break;
            default:
                yield { type: null, value };
                break;
        }
    }
}

const htmlEncode = (c) => (c === '<' ? '&lt;' : '&gt;');

/**
 * Apply syntax highlighting to source code
 * @param {string} source - source code block
 * @returns {string} - highlighted code block
 */
function syntaxHighlight(source) {
    if (source === '') return source;
    let highlighted = '';
    // tokenize source code
    for (const { type, value } of tokenize(source)) {
        const encoded = value.replace(/[<>]/g, htmlEncode);
        if (type) {
            highlighted += encoded
                .split('\n')
                .map((s) => `<span class='${type}'>${s}</span>`)
                .join('\n');
        } else {
            highlighted += encoded;
        }
    }
    return highlighted;
}

export default class LazyHighlighter {
    constructor() {
        this._stored = {};
    }

    reset() {
        this._stored = {};
    }

    add(address, content) {
        if (!this._stored[address]) {
            // store entry
            this._stored[address] = {
                content: (typeof content === 'string' ? content : content())
                    // standardize line breaks
                    .replace(/\r\n|[\n\r\u2028\u2029]/g, '\n'),
                ready: false,
            };
        }
    }

    addAll(map = {}) {
        for (const [address, content] of Object.entries(map)) {
            this.add(address, content);
        }
    }

    contains(address) {
        return !!this._stored[address];
    }

    get(address) {
        if (!this._stored[address]) return null;
        const { content, ready } = this._stored[address];
        if (ready) {
            return content;
        }
        const highlighted = syntaxHighlight(content);
        // stash highlighted content so it can be retrieved later
        this._stored[address] = {
            content: highlighted,
            ready: true,
        };
        return highlighted;
    }
}