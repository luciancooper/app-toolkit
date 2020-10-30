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

function repoUrl(repo) {
    let url;
    // test for repo shortcut syntax
    const m = repo.match(/^(?:(github|gitlab|bitbucket):)?([\w-]+)\/(.+)$/);
    if (m) {
        const { 1: host = 'github', 2: user, 3: name } = m;
        url = `git+https://${host}.com/${user}/${name}.git`;
    } else {
        // else assume repo url
        url = repo.replace(/^git@(github|gitlab|bitbucket).com:/, 'git+https://$1.com/');
    }
    return { type: 'git', url };
}

module.exports = (root, {
    isPrivate,
    keywords,
    author,
    authorEmail,
    repository,
    ...fields
}) => {
    const packageInfo = {
        ...fields,
        private: isPrivate ? true : null,
        keywords: keywords ? keywords.split(' ') : null,
        author: author
            ? (authorEmail ? `${author} <${authorEmail}>` : author)
            : null,
        repository: repository ? repoUrl(repository) : null,
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