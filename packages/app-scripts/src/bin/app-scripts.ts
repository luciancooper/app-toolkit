#!/usr/bin/env node

import chalk from 'chalk';

const scripts = [
    'build',
    'dev',
];

const [cmd, ...args] = process.argv.slice(2);

if (!cmd) {
    // log message & exit
    console.log(chalk`{bold {red Error:} must specify one of these scripts: ${
        scripts.map((id) => chalk.cyan(id)).join(', ')
    }}`);
    process.exit(1);
}

if (!scripts.includes(cmd)) {
    // log message & exit
    console.log(chalk`{bold {red Error:} unknown script {cyan ${cmd}}}`);
    process.exit(1);
}

const resolved = require.resolve(`../scripts/${cmd}`);

interface Script {
    run: (...a: string[]) => Promise<0 | 1>
}

// run script
import(resolved).then(({ run }: Script) => run(...args).catch((error: Error) => {
    console.log(chalk.bold.red('An Error Occurred:'));
    console.log(error.message);
    return 1;
})).then((exitCode) => {
    process.exit(exitCode);
});