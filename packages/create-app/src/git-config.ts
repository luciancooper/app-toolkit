/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Parse a property line from an INI file
 * @param line - ini property line
 */
function parseProperty(line: string): [string, any] {
    const m = /^\s*([^=:\s]+)\s*[=:]\s*(.*)\s*$/.exec(line);
    if (!m) {
        throw new Error(`Invalid ini property line '${line}'`);
    }
    const key = m[1]!,
        value = m[2]!;
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
 * @param lines - ini property lines
 * @returns init properties object
 */
function parseKeyValues(lines: string[]) {
    return lines.reduce<Record<string, any>>((acc, l) => {
        try {
            const [key, value] = parseProperty(l);
            if (!Object.hasOwnProperty.call(acc, key)) {
                acc[key] = value;
            }
        } catch (e) {}
        return acc;
    }, {});
}

/**
 * Parse an INI file
 * @param str - ini file content
 * @returns ini file as an object
 */
function parseIniFile(str: string) {
    const lines = str
            // take out comment lines
            .replace(/^\s*[#;][^\n\r]*[\n\r]?/gm, '')
            // take out empty lines
            .replace(/^\s*$\n?/gm, '')
            .split(/[\r\n]+/g),
        sections: [number, string][] = [];
    for (const [i, line] of lines.entries()) {
        const m = /^\s*\[\s*([^\]]+?)\s*\]\s*$/.exec(line);
        if (m) sections.push([i, m[1]!]);
    }
    // parse ini sections
    return sections.reduce<Record<string, any>>(
        (acc, [i, name], j) => {
            let key = name,
                // parse key values from section lines
                obj = parseKeyValues(
                    lines.slice(i + 1, j + 1 < sections.length ? sections[j + 1]![0] : undefined),
                );
            // check for subsection syntax (ie: [section "subsection"])
            if (/^\S+ ".*"$/.test(name)) {
                const { 1: prop, 2: subprop } = /(\S+) "(.*)"/.exec(name)! as unknown as { 1: string, 2: string };
                [key, obj] = [prop, { [subprop]: obj }];
            }
            // assign key: obj to accumulator
            acc[key] = Object.hasOwnProperty.call(acc, key) ? { ...obj, ...acc[key] } : obj;
            // return accumulator
            return acc;
        },
        // parse starting key value pairs
        parseKeyValues(lines.slice(0, sections.length ? sections[0]![0] : undefined)),
    );
}

/**
 * Parse a users default global git config file
 * @returns git config ini as an object
 */
export default function gitConfig() {
    // get .gitconfig path
    let config = path.join(os.homedir(), '.gitconfig');
    if (!fs.existsSync(config)) return null;
    // read .gitconfig file
    config = fs.readFileSync(config, 'utf8');
    // parse .gitconfig file
    return parseIniFile(config);
}