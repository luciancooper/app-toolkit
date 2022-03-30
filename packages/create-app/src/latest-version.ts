import https from 'https';
import { execSync } from 'child_process';

interface DistTagsData {
    [key: string]: string
    latest: string
}

function fetchLatestVersion(packageName: string): Promise<string> {
    const url = `https://registry.npmjs.org/-/package/${packageName}/dist-tags`;
    return new Promise<DistTagsData>((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                // A chunk of data has been recieved
                res.on('data', (chunk: string) => {
                    data += chunk;
                });
                // The whole response has been received, resolve the promise
                res.on('end', () => {
                    resolve(JSON.parse(data));
                });
            } else {
                reject(new Error(`Could not fetch dist-tags for package '${packageName}'`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    }).then(({ latest }) => latest);
}

export default function latestVersion(packageName: string): Promise<string | null> {
    return fetchLatestVersion(packageName).catch(() => {
        try {
            return execSync(
                `npm view ${packageName} version`,
                { stdio: 'ignore' },
            ).toString().trim();
        } catch (e) {
            return null;
        }
    });
}