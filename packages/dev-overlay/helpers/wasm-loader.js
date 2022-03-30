module.exports = function wasmLoader(content) {
    const base64Data = content.toString('base64');
    return [
        `var binary = window.atob("${base64Data}");`,
        'var bytes = new Uint8Array(binary.length);',
        'for (var i = 0; i < binary.length; ++i) bytes[i] = binary.charCodeAt(i);',
        'module.exports = bytes.buffer;',
    ].join('\n');
};

module.exports.raw = true;