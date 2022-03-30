const path = require('path'),
    svgToMiniDataURI = require('mini-svg-data-uri'),
    MiniCssExtractPlugin = require('mini-css-extract-plugin'),
    TerserPlugin = require('terser-webpack-plugin'),
    CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: './src/overlay/index.tsx',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'overlay.js',
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
            new CssMinimizerPlugin(),
        ],
    },
    resolve: {
        extensions: [
            '.mjs',
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.json',
        ],
    },
    module: {
        rules: [
            // process svg
            {
                test: /\.svg$/,
                type: 'asset/inline',
                generator: {
                    dataUrl: (content) => svgToMiniDataURI(content.toString()),
                },
            },
            // process js
            {
                test: /\.(?:js|mjs|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    babelrc: false,
                    configFile: false,
                    compact: true,
                    presets: [
                        '@babel/preset-env',
                        ['@babel/preset-react', {
                            runtime: 'automatic',
                            importSource: path.resolve(__dirname, './src/overlay'),
                        }],
                        '@babel/preset-typescript',
                    ],
                    plugins: [
                        ['@babel/plugin-transform-runtime', {
                            absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
                            version: require('@babel/runtime/package.json').version,
                        }],
                    ],
                },
            },
            // process scss
            {
                test: /\.scss$/,
                sideEffects: true,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 2,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                ident: 'postcss',
                                plugins: [
                                    ['postcss-preset-env', {
                                        autoprefixer: {
                                            flexbox: 'no-2009',
                                        },
                                        stage: 3,
                                    }],
                                ],
                            },
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'overlay.css',
        }),
    ],
};