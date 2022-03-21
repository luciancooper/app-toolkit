const chalk = require('chalk'),
    jsTokens = require('js-tokens');

const tokenColors = {
    keyword: chalk.cyan,
    capitalized: chalk.yellow,
    jsxIdentifier: chalk.yellow,
    punctuator: chalk.yellow,
    number: chalk.magenta,
    string: chalk.green,
    regex: chalk.magenta,
    comment: chalk.grey,
    invalid: chalk.white.bgRed.bold,
};

const keywords = new Set([
    'break', 'case', 'catch', 'continue', 'debugger', 'default', 'do', 'else', 'finally', 'for', 'function', 'if',
    'return', 'switch', 'throw', 'try', 'var', 'const', 'while', 'with', 'new', 'this', 'super', 'class', 'extends',
    'export', 'import', 'null', 'true', 'false', 'in', 'instanceof', 'typeof', 'void', 'delete',
    // reserved words
    'await', 'enum',
    // strict reserved words
    'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield',
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
                    type: keywords.has(value)
                        ? 'keyword'
                        : value[0] !== value[0].toLowerCase() ? 'capitalized' : 'uncolored',
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
                    type: /^[()[\]{}]$/.test(value) ? 'uncolored' : 'punctuator',
                    value,
                };
                break;
            case 'JSXPunctuator':
                yield { type: 'punctuator', value };
                break;
            case 'MultiLineComment':
            case 'SingleLineComment':
                yield { type: 'comment', value };
                break;
            case 'Invalid':
                yield {
                    type: (value === '@' || value === '#') ? 'punctuator' : 'invalid',
                    value,
                };
                break;
            case 'JSXInvalid':
                yield { type: 'invalid', value };
                break;
            case 'JSXIdentifier':
                yield { type: 'jsxIdentifier', value };
                break;
            default:
                yield { type: 'uncolored', value };
                break;
        }
    }
}

/**
 * Apply syntax highlighting to code source
 */
module.exports = (source) => {
    if (source === '') return source;
    let highlighted = '';
    for (const { type, value } of tokenize(source)) {
        const colorize = tokenColors[type];
        if (colorize) {
            highlighted += value.split('\n').map((str) => colorize(str)).join('\n');
        } else {
            highlighted += value;
        }
    }
    return highlighted;
};