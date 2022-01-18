const path = require('path'),
    globby = require('globby'),
    { cosmiconfigSync } = require('cosmiconfig'),
    HtmlWebpackPlugin = require('html-webpack-plugin'),
    ESLintPlugin = require('eslint-webpack-plugin'),
    StylelintPlugin = require('stylelint-webpack-plugin'),
    TerserPlugin = require('terser-webpack-plugin'),
    MiniCssExtractPlugin = require('mini-css-extract-plugin'),
    CssMinimizerPlugin = require('css-minimizer-webpack-plugin'),
    { HotModuleReplacementPlugin } = require('webpack'),
    ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin'),
    ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin'),
    svgToMiniDataURI = require('mini-svg-data-uri'),
    { root, nodeModules } = require('./paths'),
    config = require('./app.config');

function checkStylelint() {
    // check for any scss / sass files
    const files = globby.sync(
        (Array.isArray(config.source) ? config.source : [config.source])
            .map((src) => path.join(src, '**/*.s(a|c)ss')),
    );
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
            paths: [root],
        });
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = (mode) => ({
    mode,
    context: root,
    target: config.target,
    devtool: (mode === 'development')
        ? 'cheap-module-source-map'
        : 'source-map',
    entry: config.pages.reduce((acc, { name, entry }) => {
        acc[name] = entry;
        return acc;
    }, {}),
    output: {
        path: config.output,
        filename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].js'
            : 'assets/[name].js',
        chunkFilename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].chunk.js'
            : 'assets/[name].chunk.js',
        assetModuleFilename: (mode === 'production')
            ? 'assets/static/[name].[contenthash:8][ext][query]'
            : 'assets/static/[name][ext][query]',
        publicPath: (mode === 'development') ? '/' : config.publicPath,
    },
    stats: 'none',
    optimization: {
        minimize: (mode === 'production'),
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
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                defaultVendors: {
                    name: 'vendor',
                },
            },
        },
    },
    resolve: {
        modules: [
            'node_modules',
            nodeModules,
        ],
        extensions: [
            '.mjs',
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.json',
        ].filter((ext) => config.ts || !ext.startsWith('.ts')),
    },
    module: {
        rules: [
            {
                oneOf: [
                    // load img assets
                    {
                        test: /\.(?:bmp|gif|jpe?g|png)$/,
                        type: 'asset',
                        parser: {
                            // set an inline size limit of 10 KB
                            dataUrlCondition: { maxSize: 10 * 1024 },
                        },
                    },
                    // load svg assets
                    {
                        test: /\.svg$/,
                        issuer: { not: [/\.(js|jsx|mjs|ts|tsx)$/] },
                        type: 'asset',
                        generator: {
                            dataUrl: (content) => svgToMiniDataURI(content.toString()),
                        },
                        parser: {
                            // set an inline size limit of 10 KB
                            dataUrlCondition: { maxSize: 10 * 1024 },
                        },
                        use: [
                            require.resolve('svgo-loader'),
                        ],
                    },
                    // load font assets
                    {
                        test: /\.(?:woff2?|eot|ttf|otf)$/,
                        type: 'asset/resource',
                        generator: {
                            filename: (mode === 'production')
                                ? 'assets/fonts/[name].[contenthash:8][ext]'
                                : 'assets/fonts/[name][ext]',
                        },
                    },
                    // load svg assets from js src files
                    {
                        test: /\.svg$/,
                        issuer: /\.(?:js|jsx|mjs|ts|tsx)$/,
                        loader: require.resolve('@svgr/webpack'),
                        options: {
                            // don't use prettier to format output
                            prettier: false,
                            // configure svgo
                            svgoConfig: {
                                plugins: [{
                                    name: 'removeViewBox',
                                    active: false,
                                }],
                            },
                            // forward ref to the root SVG tag
                            ref: true,
                        },
                    },
                    // process source js
                    {
                        test: /\.(?:js|mjs|jsx|ts|tsx)$/,
                        include: config.source,
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
                                config.ts && [
                                    require.resolve('@babel/preset-typescript'),
                                ],
                            ].filter(Boolean),
                            plugins: [
                                [
                                    require.resolve('@babel/plugin-transform-runtime'),
                                    {
                                        absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
                                        // eslint-disable-next-line @lcooper/global-require
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
                                        // eslint-disable-next-line @lcooper/global-require
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
                                        publicPath: path.isAbsolute(config.publicPath) ? config.publicPath : '../',
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
                                        publicPath: path.isAbsolute(config.publicPath) ? config.publicPath : '../',
                                    },
                                },
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 3,
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
                                },
                            },
                            {
                                loader: require.resolve('sass-loader'),
                                options: {
                                    // eslint-disable-next-line @lcooper/global-require
                                    implementation: require('sass'),
                                    sourceMap: true,
                                },
                            },
                        ],
                    },
                    // load files
                    {
                        type: 'asset/resource',
                        exclude: [/\.(js|mjs|jsx|ts|tsx|html|json)$/],
                    },
                ],
            },
        ],
    },
    plugins: [
        // Generates an html file for each page with <script> tags injected.
        ...config.pages.map(({ name, html }) => (
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
        // Check types if using typescript
        ...config.ts ? [
            new ForkTsCheckerWebpackPlugin({
                async: mode === 'development',
                typescript: {
                    context: root,
                    configFile: config.tsConfig,
                    typescriptPath: require.resolve('typescript', {
                        paths: [nodeModules],
                    }),
                    configOverwrite: {
                        compilerOptions: {
                            skipLibCheck: true,
                            sourceMap: mode === 'production',
                            inlineSourceMap: false,
                            declarationMap: false,
                            noEmit: true,
                        },
                    },
                },
                logger: {
                    issues: 'silent',
                },
            }),
        ] : [],
        // Apply eslint to all js code
        new ESLintPlugin({
            extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
            eslintPath: require.resolve('eslint'),
            formatter: require.resolve('@lcooper/webpack-messages/eslint-formatter'),
            emitWarning: true,
            context: config.source,
        }),
        // Applies stylelint to all sass code
        ...checkStylelint() ? [
            new StylelintPlugin({
                stylelintPath: require.resolve('stylelint'),
                files: '**/*.s(a|c)ss',
                emitWarning: true,
                // eslint-disable-next-line @lcooper/global-require
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