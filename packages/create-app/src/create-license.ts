import path from 'path';
import fs from 'fs';
import https from 'https';
import chalk from 'chalk';

interface GithubLicenseData {
    key: string
    name: string
    spdx_id: string
    url: string
    node_id: string
    html_url: string
    description: string
    implementation: string
    permissions: string[]
    conditions: string[]
    limitations: string[]
    body: string
    featured: boolean
}

function fetchLicense(spdxId: string) {
    return new Promise<GithubLicenseData>((resolve, reject) => {
        const req = https.request({
            hostname: 'api.github.com',
            path: `/licenses/${spdxId}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'node.js',
            },
        }, (res) => {
            let data = '';
            // A chunk of data has been recieved
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            // The whole response has been received, resolve the promise
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(chalk`Could not fetch license text for id {yellow ${spdxId}}`));
                } else {
                    resolve(JSON.parse(data));
                }
            });
        });
        // Set request error handler
        req.on('error', (err) => {
            reject(err);
        });
        req.end();
    });
}

export default async function createLicense(root: string, spdxId: string, authorName: string) {
    let licenseText;
    try {
        ({ body: licenseText } = await fetchLicense(spdxId));
    } catch ({ message }) {
        console.log(chalk`\n{bold.red Error:} ${message}\n`);
        return;
    }
    // write LICENSE file to root dir
    fs.writeFileSync(
        path.join(root, 'LICENSE'),
        licenseText
            .replace(/\[year\]/, String(new Date().getFullYear()))
            .replace(/\[fullname\]/, authorName),
    );
}