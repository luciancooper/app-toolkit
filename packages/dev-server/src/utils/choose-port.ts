import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import portfinder from 'portfinder';
import chalk from 'chalk';

function exec(cmd: string) {
    return execSync(cmd, {
        encoding: 'utf8',
        stdio: [
            'pipe', // stdin (default)
            'pipe', // stdout (default)
            'ignore', // stderr
        ],
    });
}

function portInfo(port: number) {
    if (process.platform !== 'win32' && port < 1024 && !(process.getuid && process.getuid() === 0)) {
        return 'Admin permissions are required to run a server on a port below 1024.';
    }
    let pid,
        command,
        directory;
    try {
        // get process id
        [pid] = exec(`lsof -i:${port} -P -t -sTCP:LISTEN`).split('\n') as [string];
        pid = pid.trim();
        // get process directory
        directory = exec(`lsof -p ${pid} | awk '$4=="cwd" {for (i=9; i<=NF; i++) printf "%s ", $i}'`).trim();
        // get process command
        command = exec(`ps -o command -p ${pid} | sed -n 2p`).replace(/\n$/, '');
    } catch (e) {
        // failed to identify process, return unspecific message
        return chalk`Port {yellow ${port}} is in use.`;
    }
    // check if a package.json file exists
    const packageFile = path.join(directory, 'package.json');

    let name;
    if (fs.existsSync(packageFile) && fs.statSync(packageFile).isFile()) {
        ({ name } = JSON.parse(fs.readFileSync(packageFile).toString()) as { name: string });
    }
    const existingProcess = [
        [...(name ? [chalk.bold.cyan(name)] : []), chalk.bold.grey(`(pid ${pid})`), chalk.yellow(command)].join(' '),
        chalk`{bold.blue in} {yellow ${directory}}`,
    ].map((s) => `  ${s}`).join('\n');
    // return message with info
    return chalk`Port {yellow ${port}} is in use by:\n${existingProcess}`;
}

export default async function choosePort(defaultPort: number) {
    let port;
    try {
        port = await portfinder.getPortPromise({
            port: defaultPort,
            stopPort: defaultPort + 1000,
        });
    } catch (err) {
        throw new Error(chalk`{red Could not find an open port.}`);
    }
    if (port === defaultPort) {
        return port;
    }
    console.log(portInfo(defaultPort));
    console.log(chalk`Using port {yellow ${port}} instead`);
    return port;
}