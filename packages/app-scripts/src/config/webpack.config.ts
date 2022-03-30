import path from 'path';
import globby from 'globby';
import { cosmiconfigSync } from 'cosmiconfig';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
import StylelintPlugin from 'stylelint-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import { HotModuleReplacementPlugin } from 'webpack';
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import svgToMiniDataURI from 'mini-svg-data-uri';
import sass from 'sass';
import { version as babelRuntimeVersion } from '@babel/runtime/package.json';
import stylelintFormatter from '@lcooper/webpack-messages/stylelint-formatter';
import type { Configuration } from 'webpack';
import type { AppConfig } from './appConfig';
import { root, nodeModules } from './paths';

/**
 * Check if stylelint is linting any source files
 * @param src - source directory(s)
 */
function checkStylelint(src: string | string[]): boolean {
    // check for any scss / sass files
    const files = globby.sync(
        (Array.isArray(src) ? src : [src])
            .map((dir) => path.join(dir, '**/*.s(a|c)ss')),
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

const createConfig = (mode: 'development' | 'production', {
    pages,
    source,
    srcRoot,
    output,
    target,
    publicPath,
    ts,
    tsConfig,
}: AppConfig): Configuration => ({
    mode,
    context: root,
    target,
    devtool: (mode === 'development')
        ? 'cheap-module-source-map'
        : 'source-map',
    entry: pages.reduce<Record<string, string>>((acc, { name, entry }) => {
        acc[name] = entry;
        return acc;
    }, {}),
    output: {
        path: output,
        filename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].js'
            : 'assets/[name].js',
        chunkFilename: (mode === 'production')
            ? 'assets/[name].[contenthash:8].chunk.js'
            : 'assets/[name].chunk.js',
        assetModuleFilename: (mode === 'production')
            ? 'assets/static/[name].[contenthash:8][ext][query]'
            : 'assets/static/[name][ext][query]',
        publicPath: (mode === 'development') ? '/' : publicPath,
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
        ].filter((ext) => ts || !ext.startsWith('.ts')),
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
                            dataUrl: (content: string) => svgToMiniDataURI(content.toString()),
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
                        include: source,
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
                                ts && [
                                    require.resolve('@babel/preset-typescript'),
                                ],
                            ].filter(Boolean),
                            plugins: [
                                [
                                    require.resolve('@babel/plugin-transform-runtime'),
                                    {
                                        absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
                                        version: babelRuntimeVersion,
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
                                        version: babelRuntimeVersion,
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
                                    implementation: sass,
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
        // Check types if using typescript
        ...ts ? [
            new ForkTsCheckerWebpackPlugin({
                async: mode === 'development',
                typescript: {
                    context: root,
                    configFile: tsConfig,
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
            context: srcRoot,
        }),
        // Applies stylelint to all sass code
        ...checkStylelint(source) ? [
            new StylelintPlugin({
                stylelintPath: require.resolve('stylelint'),
                files: '**/*.s(a|c)ss',
                emitWarning: true,
                // @ts-expect-error - StylelintPlugin incorrectly typed the formatter option
                formatter: stylelintFormatter,
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

export default createConfig;