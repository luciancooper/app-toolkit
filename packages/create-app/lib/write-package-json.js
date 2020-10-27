const path = require('path'),
    os = require('os'),
    fs = require('fs');

const fieldOrder = [
    'name',
    'version',
    'private',
    'description',
    'keywords',
    'workspaces',
    'main',
    'browser',
    'bin',
    'man',
    'files',
    'directories',
    'engines',
    'os',
    'cpu',
    'sideEffects',
    'scripts',
    'config',
    'publishConfig',
    'author',
    'contributors',
    'funding',
    'license',
    'repository',
    'bugs',
    'homepage',
    'commitlint',
    'eslintConfig',
    'eslintIgnore',
    'stylelint',
    'nodemonConfig',
    'husky',
    'pre-commit',
    'lint-staged',
    'babel',
    'browserslist',
    'prettier',
    'ava',
    'jest',
    'mocha',
    'nyc',
    'tap',
    'dependencies',
    'peerDependencies',
    'devDependencies',
    'bundledDependencies',
    'optionalDependencies',
].reverse();

module.exports = (root, {
    isPrivate,
    keywords,
    author,
    authorEmail,
    ...fields
}) => {
    const packageInfo = {
        ...fields,
        private: isPrivate ? true : null,
        keywords: keywords ? keywords.split(' ') : null,
        author: author
            ? (authorEmail ? `${author} <${authorEmail}>` : author)
            : null,
    };
    // write package.json file to root dir
    fs.writeFileSync(
        path.join(root, 'package.json'),
        `{\n${
            Object.entries(packageInfo)
                // filter out fields with null values
                .filter(([, value]) => value != null)
                // sort fields
                .sort(([k1], [k2]) => fieldOrder.indexOf(k2) - fieldOrder.indexOf(k1))
                // stringify key and value
                .map(([key, value]) => `"${key}": ${JSON.stringify(value, null, 2)}`)
                .join(',\n')
                // add 2 space indent
                .replace(/^/gm, '  ')
        }\n}${os.EOL}`,
    );
};