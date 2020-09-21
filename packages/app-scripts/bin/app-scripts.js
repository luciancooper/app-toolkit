#!/usr/bin/env node

const { spawn } = require('child_process'),
    chalk = require('chalk');

const scripts = ['build', 'dev'];

process.on('unhandledRejection', (err) => {
    console.log(chalk`{red Unhandled Promise Rejection\n\n{bold >}} ${err.message}\n`);
    process.exit(1);
});

const [cmd, ...args] = process.argv.slice(2);

if (!scripts.includes(cmd)) {
    // log message & exit
    console.log(chalk`{bold {red Error:} unknown script {cyan ${cmd}}}`);
    process.exit(1);
}

// run script
spawn(process.execPath, [
    require.resolve(`../scripts/${cmd}`),
    ...args,
], { stdio: 'inherit' });