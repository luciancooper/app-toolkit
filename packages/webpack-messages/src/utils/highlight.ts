import chalk from 'chalk';
import type { Chalk } from 'chalk';
import jsTokens from 'js-tokens';

type TokenType = 'string' | 'punctuator' | 'keyword' | 'capitalized' | 'number' | 'regex' | 'comment' | 'invalid' | 'jsxIdentifier';

interface Token {
    type: TokenType | null
    value: string
}

const tokenColors: Record<TokenType, Chalk> = {
    keyword: chalk.cyan,
    capitalized: chalk.yellow,
    jsxIdentifier: chalk.yellow,
    punctuator: chalk.yellow,
    number: chalk.magenta,
    string: chalk.green,
    regex: chalk.magenta,
    comment: chalk.grey,
    invalid: chalk.white.bgRed.bold,
} as const;

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

function* tokenize(source: string): Generator<Token> {
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
                        : !value.startsWith(value[0]!.toLowerCase()) ? 'capitalized' : null,
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
                    type: /^[()[\]{}]$/.test(value) ? null : 'punctuator',
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
                yield { type: null, value };
                break;
        }
    }
}

/**
 * Apply syntax highlighting to code source
 * @param source - code to highlight
 */
export default function syntaxHighlight(source: string): string {
    if (source === '') return source;
    let highlighted = '';
    for (const { type, value } of tokenize(source)) {
        const colorize = type && tokenColors[type];
        if (colorize) {
            highlighted += value.split('\n').map((str) => colorize(str)).join('\n');
        } else {
            highlighted += value;
        }
    }
    return highlighted;
}