const REGEX = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

export default function stripAnsi(string: any) {
    return (typeof string === 'string')
        ? string.replace(REGEX, '')
        : String(string);
}