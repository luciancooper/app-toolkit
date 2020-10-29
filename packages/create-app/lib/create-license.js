const path = require('path'),
    fs = require('fs'),
    https = require('https'),
    chalk = require('chalk');

function fetchLicense(spdxId) {
    return new Promise((resolve, reject) => {
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
            res.on('data', (chunk) => {
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

module.exports = async (root, spdxId, authorName) => {
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
            .replace(/\[year\]/, new Date().getFullYear())
            .replace(/\[fullname\]/, authorName),
    );
};