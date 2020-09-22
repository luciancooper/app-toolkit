module.exports = (string) => (
    (typeof string === 'string')
        ? string.replace(
            // eslint-disable-next-line no-control-regex
            /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g,
            '',
        )
        : String(string)
);