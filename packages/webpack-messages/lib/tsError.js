const path = require('path');

module.exports = (issue) => {
    const relativeFile = issue.file && path.relative(process.cwd(), issue.file);
    return {
        type: 'tsc',
        ...issue,
        relativeFile,
    };
};