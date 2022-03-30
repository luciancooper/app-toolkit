import { execSync } from 'child_process';

export default function detectYarn() {
    try {
        execSync('yarn --version', { stdio: 'ignore' });
        return true;
    } catch (err) {
        return false;
    }
}