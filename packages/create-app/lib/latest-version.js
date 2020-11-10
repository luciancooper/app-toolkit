const https = require('https'),
    { execSync } = require('child_process');

function fetchLatestVersion(packageName) {
    const url = `https://registry.npmjs.org/-/package/${packageName}/dist-tags`;
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                // A chunk of data has been recieved
                res.on('data', (chunk) => {
                    data += chunk;
                });
                // The whole response has been received, resolve the promise
                res.on('end', () => {
                    resolve(JSON.parse(data).latest);
                });
            } else {
                reject(new Error(`Could not fetch dist-tags for package '${packageName}'`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = (packageName) => (
    fetchLatestVersion(packageName).catch(() => {
        try {
            return execSync(
                `npm view ${packageName} version`,
                { stdio: 'ignore' },
            ).toString().trim();
        } catch (e) {
            return null;
        }
    })
);