module.exports = {
    extends: [
        '@lcooper/eslint-config-react',
    ],
    settings: {
        react: {
            // arbitrary react version to avoid eslint warning
            version: '16.13.1',
        },
    },
    rules: {
        'import/no-extraneous-dependencies': 0,
        'react/jsx-key': 0,
    },
};