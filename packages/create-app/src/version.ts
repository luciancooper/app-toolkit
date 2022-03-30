/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Cannot be `import` as it's not under TS root dir
const { version } = require('../package.json') as { version: string };

export default function getVersion(): string {
    return version;
}