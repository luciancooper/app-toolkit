/**
 * Prepend additional entry files into a webpack entry config
 * @param {string|Array|Object} original - original entry
 * @param {string[]} additional - additional entry files
 * @returns {Array|Object} - modified webpack entry
 */
module.exports = function prependEntry(original, additional) {
    // check if entry is an object
    if (typeof original === 'object' && !Array.isArray(original)) {
        return Object.entries(original).reduce((acc, [key, entry]) => {
            acc[key] = (typeof entry === 'object' && entry.import)
                ? {
                    ...entry,
                    import: prependEntry(entry.import, additional),
                }
                : prependEntry(entry, additional);
            return acc;
        }, {});
    }
    // entry is a string or an array. ensure that duplicates are not added.
    return (typeof original === 'string' ? [original] : original)
        .reduce((acc, entry) => {
            if (!acc.includes(entry)) {
                acc.push(entry);
            }
            return acc;
        }, [...additional]);
};