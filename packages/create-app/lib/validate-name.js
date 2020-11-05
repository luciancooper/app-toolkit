const chalk = require('chalk'),
    validatePackageName = require('validate-npm-package-name');

module.exports = (name) => {
    const {
        validForNewPackages,
        errors = [],
        warnings = [],
    } = validatePackageName(name);
    if (!validForNewPackages) {
        throw new Error([
            chalk`{yellow Cannot create a project named {cyan ${name}} because of npm naming restrictions:}\n`,
            ...[...errors, ...warnings].map((msg) => chalk`  {dim *} {italic ${msg}}`),
        ].join('\n'));
    }
    return true;
};