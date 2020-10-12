const path = require('path'),
    MiniCssExtractPlugin = require('mini-css-extract-plugin'),
    TerserPlugin = require('terser-webpack-plugin'),
    OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: './src/overlay.js',
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
            new OptimizeCSSAssetsPlugin(),
        ],
    },
    module: {
        rules: [
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
                        ['@babel/preset-react', {
                            runtime: 'automatic',
                            importSource: path.resolve(__dirname, './src'),
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
                            // eslint-disable-next-line global-require
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