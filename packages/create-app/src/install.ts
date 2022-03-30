import spawn from 'cross-spawn';
import chalk from 'chalk';

/**
 * Install project dependencies
 * @param root - path to install packages to
 * @param dependencies - list of packages to install
 * @param yarn - install with yarn
 * @param dev - install as dev dependencies
 */
export default function install(
    root: string,
    dependencies: string[],
    yarn: boolean,
    dev = false,
) {
    const [cmd, ...args] = [
        ...yarn
            ? ['yarn', 'add', dev && '--dev']
            : ['npm', 'install', dev && '--save-dev'],
        ...dependencies,
    ].filter(Boolean) as [string, ...string[]];
    // return promise
    return new Promise<void>((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: root,
            stdio: 'inherit',
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(chalk`Failed to execute install: {cyan {bold ${cmd}} ${args.join(' ')}}`));
            } else resolve();
        });
    });
}