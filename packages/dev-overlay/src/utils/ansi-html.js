const ANSI_COLORS = [
    '#000000', // Black
    '#cd0000', // Red
    '#00cd00', // Green
    '#cdcd00', // Yellow
    '#0000ee', // Blue
    '#e5e5e5', // Magenta
    '#00cdcd', // Cyan
    '#e5e5e5', // White
    '#7f7f7f', // Bright Black (Gray)
    '#ff0000', // Bright Red
    '#00ff00', // Bright Green
    '#ffff00', // Bright Yellow
    '#5c5cff', // Bright Blue
    '#ff00ff', // Bright Magenta
    '#00ffff', // Bright Cyan
    '#ffffff', // Bright White
];

function getExtendedColor([mode, ...seq]) {
    switch (mode) {
        case 2: {
            // true color (24 bit color)
            const [r = 0, g = 0, b = 0] = seq.map((v) => Math.max(Math.min(v, 255), 0)),
                hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            return `#${hex}`;
        }
        case 5: {
            // xterm 256 color (8 bit color)
            const [n = 0] = seq;
            if (n < 16) {
                return ANSI_COLORS[n];
            }
            if (n >= 232) {
                const gray = (n - 232) * 10 + 8;
                return `#${((1 << 8) + gray).toString(16).slice(1).repeat(3)}`;
            }
            // 16 ... 231
            const levels = ['00', '5f', '87', 'af', 'd7', 'ff'];
            return `#${[
                Math.floor((n - 16) / 36),
                Math.floor(((n - 16) % 36) / 6),
                (n - 16) % 6,
            ].map((i) => levels[i]).join('')}`;
        }
        default:
            return null;
    }
}

function updateState(seq, [attr, fg, bg]) {
    // check for extended color sequences 38;... / 48;....
    if (/^[34]8;/.test(seq)) {
        const color = getExtendedColor(seq.split(';').slice(1).map(Number));
        return seq[0] === '3' ? [attr, color, bg] : [attr, fg, color];
    }
    // ignore other complex sequences
    if (/;/.test(seq)) return null;

    const code = Number(seq);
    // reset code
    if (code === 0) return [0, null, null];
    // set attr code
    if ([1, 2, 3, 4, 7, 9].includes(code)) {
        const i = [1, 2, 3, 4, 9, 7].indexOf(code);
        return [attr | (1 << i), fg, bg];
    }
    // reset attr code
    if ([22, 23, 24, 27, 29].includes(code)) {
        const mask = {
            22: 0b111100, // bold & dim off
            23: 0b111011, // italic off
            24: 0b110111, // underline off
            27: 0b011111, // inverse off
            29: 0b101111, // strikethrough off
        }[code];
        return [attr & mask, fg, bg];
    }
    // foreground color
    if (code >= 30 && code <= 37) {
        return [attr, ANSI_COLORS[code % 10], bg];
    }
    // background color
    if (code >= 40 && code <= 47) {
        return [attr, fg, ANSI_COLORS[code % 10]];
    }
    // foreground bright color
    if (code >= 90 && code <= 97) {
        return [attr, ANSI_COLORS[8 + (code % 10)], bg];
    }
    // background bright color
    if (code >= 100 && code <= 107) {
        return [attr, fg, ANSI_COLORS[8 + (code % 10)]];
    }
    // foreground reset
    if (code === 39) return [attr, null, bg];
    // background reset
    if (code === 49) return [attr, fg, null];
    // otherwise, ignore sequence
    return null;
}

/**
 * Resolve html style from ansi state
 * @param {number} attr - attribute mask
 * @param {?string} fg - foreground color
 * @param {?string} bg - background color
 * @returns {string} - html style attribute string
 */
function resolveStyle(attr, fg, bg) {
    // create initial style array
    const styles = [
        'font-weight:bold', // bold
        'opacity:0.5', // dim
        'font-style:italic', // italic
    ].filter((s, i) => attr & (1 << i));
    // check for text-decoration style
    if (attr & 0b011000) {
        styles.push(`text-decoration:${
            ['underline', 'line-through'].filter((s, i) => attr & (1 << i + 3)).join(' ')
        }`);
    }
    // check invert flag
    const invert = Boolean(attr & 0b100000);
    if (fg) {
        styles.push(invert ? `background-color:${fg}` : `color:${fg}`);
    }
    if (bg) {
        styles.push(invert ? `color:${bg}` : `background-color:${bg}`);
    }
    return styles.join(';');
}

/**
 * Convert ansi escape sequences to html
 * @param {string} text - string containing ansi escape sequences
 * @returns {string} - html string
 */
module.exports = (text) => {
    const regex = /\033\[(\d+(?:;\d+)*)*m/g,
        tokens = [];
    let i = 0,
        chunk = '',
        // 6 bit attribute mask - [bold, dim, italic, underline, strikethrough, inverse]
        attr = 0,
        // foreground & background color state
        [fg, bg] = [null, null];
    // match each ansi escape sequence
    for (let m = regex.exec(text); m; m = regex.exec(text)) {
        const { 0: full, 1: seq, index: j } = m;
        // extend chunk
        chunk += text.slice(i, j);
        // update attribute & color state
        const nextState = updateState(seq, [attr, fg, bg]);
        // check if this sequence changed the style state
        if (nextState !== null) {
            // add chunk to the tokens array
            if (chunk) tokens.push({ str: chunk, style: resolveStyle(attr, fg, bg) });
            // reset chunk
            chunk = '';
            // apply next state
            [attr, fg, bg] = nextState;
        }
        i = j + full.length;
    }
    // extend the final chunk
    chunk += text.slice(i);
    // add the last chunk to the tokens array
    if (chunk) tokens.push({ str: chunk, style: resolveStyle(attr, fg, bg) });
    // merge adjacent tokens with matching styles
    let x = 0;
    while (x < tokens.length - 1) {
        if (tokens[x].style === tokens[x + 1].style) {
            tokens[x].str += tokens[x + 1].str;
            tokens.splice(x + 1, 1);
        } else {
            x += 1;
        }
    }
    // convert tokens to html
    return tokens.map(({ str, style }) => {
        const encoded = str.replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'));
        return style ? `<span style='${style}'>${encoded}</span>` : encoded;
    }).join('');
};