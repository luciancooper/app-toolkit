import type { Configuration, EntryObject } from 'webpack';

type EntryStatic = string | EntryObject | string[];

function prependEntryItem(original: string | string[], additional: string[]) {
    return [
        ...additional,
        ...(typeof original === 'string' ? [original] : original),
    ].filter((item, i, array) => array.indexOf(item) === i);
}

function prependEntryStatic(original: EntryStatic, additional: string[]) {
    // check if entry is a string or array of strings
    if (typeof original === 'string' || Array.isArray(original)) {
        return prependEntryItem(original, additional);
    }
    // entry is an EntryObject. Modify each field
    const modified: EntryObject = {};
    for (const [key, entry] of Object.entries(original)) {
        modified[key] = (typeof entry === 'string' || Array.isArray(entry))
            ? prependEntryItem(entry, additional)
            : { ...entry, import: prependEntryItem(entry.import, additional) };
    }
    return modified;
}

/**
 * Prepend additional entry files into a webpack entry config
 * @param original - original entry
 * @param additional - additional entry files
 * @returns modified webpack entry
 */
export default function prependEntry(original: Configuration['entry'], additional: string[]) {
    if (!original) {
        return [...additional];
    }
    // check if entry is a function
    if (typeof original === 'function') {
        // return wrapped entry function
        return () => {
            const result = original();
            if (typeof result !== 'string' && !Array.isArray(result) && typeof result.then === 'function') {
                return result.then((value) => prependEntryStatic(value, additional));
            }
            return prependEntryStatic(result as EntryStatic, additional);
        };
    }
    return prependEntryStatic(original, additional);
}