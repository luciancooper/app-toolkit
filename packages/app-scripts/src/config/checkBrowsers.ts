import browserslist from 'browserslist';
import chalk from 'chalk';

const suggestedConfig = {
    production: [
        '>0.2%',
        'not dead',
        'not op_mini all',
    ],
    development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
    ],
};

export default function checkBrowsers(root: string): string | null {
    // check for config
    const current = browserslist.loadConfig({ path: root });
    if (current != null) {
        return null;
    }
    // return message
    const suggested = JSON.stringify({ browserslist: suggestedConfig }, null, 2)
        .replace(/^[{}]$/gm, '')
        .trim()
        .replace(/^ {2}/gm, '')
        .replace(/"[^"]+"/g, (m) => chalk.yellow(m));
    return chalk`{bold Unable to detect target browsers.}\n\n`
        + chalk`Add the {bold.yellow browserslist} field to your {yellow package.json}, for example:\n\n`
        + suggested;
}