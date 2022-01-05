module.exports = {
    extends: [
        '@lcooper/eslint-config-react',
    ],
    settings: {
        react: {
            // arbitrary react version to avoid eslint warning
            version: '17.0',
        },
    },
    rules: {
        'import/no-extraneous-dependencies': 0,
        'react/jsx-key': 0,
        // Prevent missing React when using JSX
        'react/react-in-jsx-scope': 0,
        // Prevent React to be marked as unused
        'react/jsx-uses-react': 0,
    },
};