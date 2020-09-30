const path = require('path'),
    TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: './src/overlay.js',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'overlay-bundle.js',
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        warnings: false,
                        comparisons: false,
                    },
                    output: {
                        comments: false,
                        ascii_only: false,
                    },
                },
                extractComments: false,
            }),
        ],
    },
    module: {
        rules: [
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
                },
            },
        ],
    },
};