const { execSync } = require('child_process');

module.exports = () => {
    try {
        execSync('yarn --version', { stdio: 'ignore' });
        return true;
    } catch (err) {
        return false;
    }
};