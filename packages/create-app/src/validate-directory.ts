import fs from 'fs-extra';
import chalk from 'chalk';

const whitelist = [
    '.DS_Store',
    '.vscode',
    '.idea',
    '.project',
    '.settings',
];

export default function validateDirectory(dir: string) {
    // ensure directory exists
    fs.ensureDirSync(dir);
    // ensure directory is empty (except for whitelisted files)
    const files = fs.readdirSync(dir)
        .filter((file) => !whitelist.includes(file));
    if (files.length === 0) {
        return true;
    }
    throw new Error(chalk`{cyan ${dir}} is not an empty directory`);
}