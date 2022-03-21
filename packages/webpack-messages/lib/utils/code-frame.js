const chalk = require('chalk'),
    stripAnsi = require('./strip-ansi');

const colorDefs = {
    gutter: chalk.grey,
    marker: chalk.red.bold,
};

module.exports = (source, loc, { linesAbove = 2, linesBelow = 3 } = {}) => {
    const sourceLines = source.split('\n'),
        { line: l1, column: c1 } = { line: -1, column: 0, ...loc.start },
        { line: l2, column: c2 } = { line: l1, column: c1, ...loc.end },
        start = Math.max(l1 - linesAbove, 1),
        end = Math.min(l2 + linesBelow, sourceLines.length),
        numberMaxWidth = String(end).length,
        frame = [];
    // format each context line
    for (const [index, line] of sourceLines.slice(start - 1, end).entries()) {
        const ln = start + index,
            paddedNumber = String(ln).padStart(numberMaxWidth, ' '),
            useMarker = ln >= l1 && ln <= l2;
        // add code line
        frame.push([
            useMarker ? colorDefs.marker('>') : ' ',
            colorDefs.gutter(` ${paddedNumber} |`),
            line.length > 0 ? ` ${line}` : '',
        ].join(''));

        if (!useMarker || (l1 < l2 ? !c1 : (c1 === c2 && !c1))) {
            continue;
        }
        const stripped = stripAnsi(line),
            [idx, len] = l1 === l2 ? [c1, Math.max(c2 - c1, 1)]
                : ln === l1 ? [c1, stripped.length - c1 + 1] : [0, ln === l2 ? c2 : stripped.length];
        // add marker line
        frame.push([
            ' '.repeat(numberMaxWidth + 3),
            colorDefs.gutter('|'),
            ' ',
            stripped.slice(0, Math.max(idx - 1, 0)).replace(/[^\t]/g, ' '),
            colorDefs.marker('^'.repeat(len || 1)),
        ].join(''));
    }
    return chalk.reset(frame.join('\n'));
};