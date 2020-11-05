const spawn = require('cross-spawn'),
    chalk = require('chalk');

/**
 * Install project dependencies
 * @param {string} root - path to install packages to
 * @param {string[]} dependencies - list of packages to install
 * @param {boolean} yarn - install with yarn
 * @param {boolean} [dev=false] - install as dev dependencies
 * @returns {Promise}
 */
module.exports = (root, dependencies, yarn, dev = false) => {
    const [cmd, ...args] = [
        ...yarn
            ? ['yarn', 'add', dev && '--dev']
            : ['npm', 'install', dev && '--save-dev'],
        ...dependencies,
    ].filter(Boolean);
    // return promise
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: root,
            stdio: 'inherit',
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(chalk`Failed to execute install: {cyan {bold ${cmd}} ${args.join(' ')}}`));
                return;
            }
            resolve();
        });
    });
};