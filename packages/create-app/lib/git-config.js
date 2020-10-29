const path = require('path'),
    fs = require('fs'),
    os = require('os');

/**
 * Parse a property line from an INI file
 * @param {string} line - ini property line
 * @returns {string[]} - [key, value]
 */
function parseProperty(line) {
    const m = line.match(/^\s*([^=:\s]+)\s*[=:]\s*(.*)\s*$/);
    if (!m) {
        throw new Error(`Invalid ini property line '${line}'`);
    }
    const { 1: key, 2: value } = m;
    switch (value) {
        case 'true':
        case 'false':
        case 'null':
            return [key, JSON.parse(value)];
        default:
            return [key, value];
    }
}

/**
 * Parse a set of property lines from an INI file
 * @param {string[]} lines - ini property lines
 * @returns {Object}
 */
function parseKeyValues(lines) {
    return lines.reduce((acc, l) => {
        let [key, value] = [];
        try {
            [key, value] = parseProperty(l);
        } catch (e) {
            return acc;
        }
        if (!Object.hasOwnProperty.call(acc, key)) {
            acc[key] = value;
        }
        return acc;
    }, {});
}

/**
 * Parse an INI file
 * @param {string} str - ini file content
 * @returns {Object} - ini file as an object
 */
function parseIniFile(str) {
    const lines = str
            // take out comment lines
            .replace(/^\s*[#;][^\n\r]*[\n\r]?/gm, '')
            // take out empty lines
            .replace(/^\s*$\n?/gm, '')
            .split(/[\r\n]+/g),
        sections = lines.map((l, i) => {
            const m = l.match(/^\s*\[\s*([^\]]+?)\s*\]\s*$/);
            return m ? [i, m[1]] : null;
        }).filter(Boolean);
    // parse ini sections
    return sections.reduce(
        (acc, [i, name], j) => {
            let key = name,
                // parse key values from section lines
                obj = parseKeyValues(
                    lines.slice(i + 1, j + 1 < sections.length ? sections[j + 1][0] : undefined),
                );
            // check for subsection syntax (ie: [section "subsection"])
            if (/^\S+ ".*"$/.test(name)) {
                const { 1: prop, 2: subprop } = name.match(/(\S+) "(.*)"/);
                [key, obj] = [prop, { [subprop]: obj }];
            }
            // assign key: obj to accumulator
            acc[key] = Object.hasOwnProperty.call(acc, key)
                ? { ...obj, ...acc[key] }
                : obj;
            // return accumulator
            return acc;
        },
        // parse starting key value pairs
        parseKeyValues(lines.slice(0, sections.length ? sections[0][0] : undefined)),
    );
}

/**
 * Parse a users default global git config file
 * @returns {?Object} - git config ini as an object
 */
module.exports = () => {
    // get .gitconfig path
    let config = path.join(os.homedir(), '.gitconfig');
    if (!fs.existsSync(config)) return null;
    // read .gitconfig file
    config = fs.readFileSync(config, 'utf8');
    // parse .gitconfig file
    return parseIniFile(config);
};