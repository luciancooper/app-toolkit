const path = require('path'),
    globby = require('globby'),
    { cosmiconfigSync } = require('cosmiconfig'),
    HtmlWebpackPlugin = require('html-webpack-plugin'),
    ESLintPlugin = require('eslint-webpack-plugin'),
    StylelintPlugin = require('stylelint-webpack-plugin'),
    TerserPlugin = require('terser-webpack-plugin'),
    MiniCssExtractPlugin = require('mini-css-extract-plugin'),
    OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin'),
    { HotModuleReplacementPlugin } = require('webpack'),
    ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin'),
    svgToMiniDataURI = require('mini-svg-data-uri'),
    paths = require('./paths'),
    { target, publicPath, pages } = require('./app.config');

function checkStylelint() {
    // check for any scss / sass files
    const files = globby.sync(path.join(paths.src, '**/*.s(a|c)ss'));
    // if no scss files are found, return false
    if (!files.length) return false;
    // create a synchronous cosmiconfig explorer instance and ensure a config exists for each file
    const explorer = cosmiconfigSync('stylelint');
    for (let i = 0; i < files.length; i += 1) {
        if (explorer.search(files[i]) == null) return false;
    }
    return true;
}

function checkJsxRuntime() {
    try {
        require.resolve('react/jsx-runtime.js', {
            paths: [paths.root],
        });
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = (mode) => ({
    mode,
    target,
    devtool: (mode === 'development')
        ? 'cheap-module-source-map'
        : 'source-map',
    entry: pages.reduce((acc, { name, entry }) => {
        acc[name] = entry;
        return acc;
    }, {}),
    output: {
        path: paths.dist,
        filename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].js'
            : 'assets/[name].js',
        chunkFilename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].chunk.js'
            : 'assets/[name].chunk.js',
        publicPath: (mode === 'development') ? '/' : publicPath,
    },
    optimization: {
        minimize: (mode === 'production'),
        minimizer: [
            new TerserPlugin({
                sourceMap: true,
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
            new OptimizeCSSAssetsPlugin({
                cssProcessorOptions: {
                    map: {
                        inline: false,
                    },
                },
            }),
        ],
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'initial',
                    name: 'vendor',
                    enforce: true,
                },
            },
        },
    },
    resolve: {
        modules: [
            'node_modules',
            path.resolve(paths.root, 'node_modules'),
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
                    // load img assets
                    {
                        test: /\.(?:bmp|gif|jpe?g|png)$/,
                        loader: require.resolve('url-loader'),
                        options: {
                            // set an inline size limit of 10 KB
                            limit: 10 * 1024,
                            // options for file-loader fallback
                            name: (mode === 'production')
                                ? '[name].[contenthash:8].[ext]'
                                : '[name].[ext]',
                            outputPath: 'assets/static',
                        },
                    },
                    // load svg assets
                    {
                        test: /\.svg$/,
                        use: [
                            {
                                loader: require.resolve('url-loader'),
                                options: {
                                    // set an inline size limit of 10 KB
                                    limit: 10 * 1024,
                                    generator: (content) => svgToMiniDataURI(content.toString()),
                                    // options for file-loader fallback
                                    name: (mode === 'production')
                                        ? '[name].[contenthash:8].[ext]'
                                        : '[name].[ext]',
                                    outputPath: 'assets/static',
                                },
                            },
                            require.resolve('svgo-loader'),
                        ],
                    },
                    // load font assets
                    {
                        test: /\.(?:woff2?|eot|ttf|otf)$/,
                        loader: require.resolve('file-loader'),
                        options: {
                            name: (mode === 'production')
                                ? '[name].[contenthash:8].[ext]'
                                : '[name].[ext]',
                            outputPath: 'assets/fonts',
                        },
                    },
                    // process source js
                    {
                        test: /\.(?:js|mjs|jsx)$/,
                        include: paths.src,
                        loader: require.resolve('babel-loader'),
                        options: {
                            babelrc: false,
                            configFile: false,
                            presets: [
                                [require.resolve('@babel/preset-env'), {
                                    browserslistEnv: mode,
                                }],
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
                                [
                                    require.resolve('babel-plugin-named-asset-import'),
                                    {
                                        loaderMap: {
                                            svg: {
                                                ReactComponent: `${require.resolve('@svgr/webpack')}?+ref![path]`,
                                            },
                                        },
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
                                : {
                                    loader: MiniCssExtractPlugin.loader,
                                    options: {
                                        publicPath: path.isAbsolute(publicPath) ? publicPath : '../',
                                    },
                                },
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 1,
                                    sourceMap: true,
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
                                    sourceMap: true,
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
                                : {
                                    loader: MiniCssExtractPlugin.loader,
                                    options: {
                                        publicPath: path.isAbsolute(publicPath) ? publicPath : '../',
                                    },
                                },
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 2,
                                    sourceMap: true,
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
                                    sourceMap: true,
                                },
                            },
                            {
                                loader: require.resolve('resolve-url-loader'),
                                options: {
                                    sourceMap: true,
                                    root: paths.src,
                                },
                            },
                            {
                                loader: require.resolve('sass-loader'),
                                options: {
                                    // eslint-disable-next-line global-require
                                    implementation: require('sass'),
                                    sourceMap: true,
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
        // Generates an html file for each page with <script> tags injected.
        ...pages.map(({ name, html }) => (
            new HtmlWebpackPlugin({
                inject: true,
                template: html,
                chunks: [name],
                filename: `${name}.html`,
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
            })
        )),
        // Apply eslint to all js code
        new ESLintPlugin({
            context: paths.src,
            extensions: ['js', 'mjs', 'jsx'],
            eslintPath: require.resolve('eslint'),
            formatter: require.resolve('@lcooper/webpack-messages/eslint-formatter'),
            emitWarning: true,
        }),
        // Applies stylelint to all sass code
        ...checkStylelint() ? [
            new StylelintPlugin({
                stylelintPath: require.resolve('stylelint'),
                files: '**/*.s(a|c)ss',
                emitWarning: true,
                // eslint-disable-next-line global-require
                formatter: require('@lcooper/webpack-messages/stylelint-formatter'),
            }),
        ] : [],
        // development plugins
        ...(mode === 'development') ? [
            // hmr plugin
            new HotModuleReplacementPlugin(),
            // react refresh webpack plugin
            new ReactRefreshPlugin({
                overlay: false,
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