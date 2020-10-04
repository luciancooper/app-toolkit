const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'index.js',
        library: 'dev-overlay',
        libraryTarget: 'umd',
    },
    resolve: {
        alias: {
            overlay$: path.resolve(__dirname, './dist/overlay-bundle.js'),
        },
    },
    module: {
        rules: [
            {
                oneOf: [
                    // overlay script
                    {
                        test: /overlay-bundle\.js$/,
                        use: 'raw-loader',
                    },
                    // process js
                    {
                        test: /\.(?:js|mjs|jsx)$/,
                        exclude: /node_modules/,
                        loader: 'babel-loader',
                        options: {
                            babelrc: false,
                            configFile: false,
                            compact: true,
                            presets: [
                                '@babel/preset-env',
                            ],
                            plugins: [
                                ['@babel/plugin-transform-runtime', {
                                    absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
                                    // eslint-disable-next-line global-require
                                    version: require('@babel/runtime/package.json').version,
                                }],
                            ],
                        },
                    },
                ],
            },
        ],
    },
};