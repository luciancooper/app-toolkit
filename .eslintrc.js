module.exports = {
    extends: '@lcooper/eslint-config-typescript',
    ignorePatterns: [
        '**/dist/**/*',
        '**/lib/**/*',
        '**/template/**/*.js',
    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: [
            'packages/*/tsconfig.json',
            'packages/*/tsconfig.*.json',
            'tsconfig.json',
        ],
    },
    settings: {
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: [
                    'packages/*/tsconfig.json',
                    'packages/*/tsconfig.*.json',
                    'tsconfig.json',
                ],
            },
        },
    },
    overrides: [
        // disable react rules that don't work with a custom jsx runtime
        {
            files: 'packages/dev-overlay/src/overlay/**/*.tsx',
            extends: [
                '@lcooper/eslint-config-typescript-react',
            ],
            rules: {
                'react/jsx-key': 0,
                // Prevent missing React when using JSX
                'react/react-in-jsx-scope': 0,
                // Prevent React to be marked as unused
                'react/jsx-uses-react': 0,
                // Prevent requiring of default props
                'react/require-default-props': 0,
                // Warn if a prop with a defined type isn't being used.
                'react/no-unused-prop-types': 0,
            },
            settings: {
                react: {
                    // arbitrary react version to avoid eslint warning
                    version: '17.0',
                },
            },
        },
        {
            files: 'packages/dev-overlay/src/**/*.{ts,tsx}',
            rules: {
                'import/no-extraneous-dependencies': 0,
            },
        },
    ],
};