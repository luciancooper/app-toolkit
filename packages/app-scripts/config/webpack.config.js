const path = require('path'),
    fs = require('fs'),
    globby = require('globby'),
    HtmlWebpackPlugin = require('html-webpack-plugin'),
    ESLintPlugin = require('eslint-webpack-plugin'),
    stylelint = require('stylelint'),
    StylelintPlugin = require('stylelint-webpack-plugin'),
    TerserPlugin = require('terser-webpack-plugin'),
    MiniCssExtractPlugin = require('mini-css-extract-plugin'),
    OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const appPath = fs.realpathSync(process.cwd()),
    appSrc = path.resolve(appPath, './src');

function checkStylelint() {
    // check for any scss / sass files
    return globby(path.join(appSrc, '**/*.s(a|c)ss')).then((files) => {
        // if no scss files are found, return false
        if (!files.length) return Promise.resolve(false);
        // create linter and ensure a config exists for each file
        const linter = stylelint.createLinter();
        return Promise.all(files.map((file) => linter.getConfigForFile(file)))
            .then(() => true)
            .catch((err) => false);
    });
}

function checkJsxRuntime() {
    try {
        require.resolve('react/jsx-runtime.js', {
            paths: [appPath],
        });
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = async (mode) => ({
    mode,
    devtool: (mode === 'development')
        ? 'cheap-module-source-map'
        : 'source-map',
    entry: [
        path.resolve(appPath, 'src/index'),
    ],
    output: {
        path: path.resolve(appPath, 'dist'),
        filename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].js'
            : 'assets/[name].js',
        chunkFilename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].chunk.js'
            : 'assets/[name].chunk.js',
        publicPath: '/',
    },
    optimization: {
        minimize: (mode === 'production'),
        minimizer: [
            new TerserPlugin({
                sourceMap: true,
            }),
            new OptimizeCSSAssetsPlugin(),
        ],
        splitChunks: {
            chunks: 'all',
        },
    },
    resolve: {
        modules: [
            'node_modules',
            path.resolve(appPath, 'node_modules'),
        ],
        extensions: [
            '.mjs',
            '.js',
            '.json',
            '.jsx',
        ],
    },
    module: {
        rules: [
            {
                oneOf: [
                    // url-loader
                    {
                        test: /\.(?:bmp|gif|jpe?g|png)$/,
                        loader: require.resolve('url-loader'),
                        options: {
                            limit: 1000,
                            // options for file-loader fallback
                            name: (mode === 'production')
                                ? '[name].[contenthash:8].[ext]'
                                : '[name].[ext]',
                            outputPath: 'assets/static',
                        },
                    },
                    // process source js
                    {
                        test: /\.(?:js|mjs|jsx)$/,
                        include: appSrc,
                        loader: require.resolve('babel-loader'),
                        options: {
                            babelrc: false,
                            configFile: false,
                            presets: [
                                require.resolve('@babel/preset-env'),
                                [require.resolve('@babel/preset-react'), {
                                    runtime: checkJsxRuntime() ? 'automatic' : 'classic',
                                }],
                            ],
                            plugins: [
                                [
                                    require.resolve('@babel/plugin-transform-runtime'),
                                    {
                                        absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
                                        // eslint-disable-next-line global-require
                                        version: require('@babel/runtime/package.json').version,
                                    },
                                ],
                                (mode === 'development') && require.resolve('react-refresh/babel'),
                            ].filter(Boolean),
                            cacheDirectory: true,
                            compact: (mode === 'production'),
                        },
                    },
                    // process external js
                    {
                        test: /\.(?:js|mjs)$/,
                        exclude: /(@babel(?:\/|\\{1,2})runtime)/,
                        loader: require.resolve('babel-loader'),
                        options: {
                            babelrc: false,
                            configFile: false,
                            sourceType: 'unambiguous',
                            presets: [
                                require.resolve('@babel/preset-env'),
                                require.resolve('@babel/preset-react'),
                            ],
                            plugins: [
                                [
                                    require.resolve('@babel/plugin-transform-runtime'),
                                    {
                                        absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
                                        // eslint-disable-next-line global-require
                                        version: require('@babel/runtime/package.json').version,
                                    },
                                ],
                            ],
                            cacheDirectory: true,
                            compact: false,
                        },
                    },
                    // process css
                    {
                        test: /\.css$/,
                        sideEffects: true,
                        use: [
                            (mode === 'development')
                                ? require.resolve('style-loader')
                                : MiniCssExtractPlugin.loader,
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 1,
                                },
                            },
                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    postcssOptions: {
                                        ident: 'postcss',
                                        plugins: [
                                            [
                                                require.resolve('postcss-preset-env'),
                                                {
                                                    autoprefixer: {
                                                        flexbox: 'no-2009',
                                                    },
                                                    stage: 3,
                                                },
                                            ],
                                        ],
                                    },
                                },
                            },
                        ],
                    },
                    // process sass
                    {
                        test: /\.(?:scss|sass)$/,
                        sideEffects: true,
                        use: [
                            (mode === 'development')
                                ? require.resolve('style-loader')
                                : MiniCssExtractPlugin.loader,
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 2,
                                },
                            },
                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    postcssOptions: {
                                        ident: 'postcss',
                                        plugins: [
                                            [
                                                require.resolve('postcss-preset-env'),
                                                {
                                                    autoprefixer: {
                                                        flexbox: 'no-2009',
                                                    },
                                                    stage: 3,
                                                },
                                            ],
                                        ],
                                    },
                                },
                            },
                            {
                                loader: require.resolve('sass-loader'),
                                options: {
                                    // eslint-disable-next-line global-require
                                    implementation: require('sass'),
                                },
                            },
                        ],
                    },
                    // file-loader
                    {
                        loader: require.resolve('file-loader'),
                        exclude: [
                            /\.(js|mjs|jsx)$/,
                            /\.html$/,
                            /\.json$/,
                        ],
                        options: {
                            name: (mode === 'production')
                                ? '[name].[contenthash:8].[ext]'
                                : '[name].[ext]',
                            outputPath: 'assets/static',
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        // Generates `index.html` with the <script> injected.
        new HtmlWebpackPlugin({
            inject: true,
            template: path.resolve(appPath, 'src/index.html'),
            ...((mode === 'production') ? {
                minify: {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true,
                    minifyURLs: true,
                },
            } : {}),
        }),
        // Apply eslint to all js code
        new ESLintPlugin({
            context: appSrc,
            extensions: ['js', 'mjs', 'jsx'],
            eslintPath: require.resolve('eslint'),
            formatter: require.resolve('../lib/eslint-formatter'),
            emitWarning: true,
        }),
        // Applies stylelint to all sass code
        ...(await checkStylelint()) ? [
            new StylelintPlugin({
                stylelintPath: require.resolve('stylelint'),
                files: '**/*.s(a|c)ss',
                emitWarning: true,
                // eslint-disable-next-line global-require
                formatter: require('../lib/stylelint-formatter'),
            }),
        ] : [],
        // production plugins
        ...(mode === 'production') ? [
            new MiniCssExtractPlugin({
                filename: 'assets/[name].[contenthash:8].css',
                chunkFilename: 'assets/[name].[contenthash:8].chunk.css',
            }),
        ] : [],
    ],
});