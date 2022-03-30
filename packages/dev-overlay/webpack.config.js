const path = require('path'),
    svgToMiniDataURI = require('mini-svg-data-uri');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'index.js',
        library: 'dev-overlay',
        libraryTarget: 'umd',
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
        alias: {
            'overlay-js$': path.resolve(__dirname, './dist/overlay.js'),
            'overlay-css$': path.resolve(__dirname, './dist/overlay.css'),
        },
        plugins: [{
            // override requests to 'source-map/lib/read-wasm'
            apply(resolver) {
                const target = resolver.ensureHook('resolved'),
                    override = path.resolve(__dirname, './helpers/read-wasm.js');
                resolver
                    .getHook('resolve')
                    .tapAsync('source-map-override', (request, resolveContext, callback) => {
                        // check if requested path is not 'source-map/lib/read-wasm'
                        if (!/\bsource-map\b/.test(request.path) || !request.request.endsWith('read-wasm')) {
                            return void callback();
                        }
                        // point request to our override of 'source-map/lib/read-wasm'
                        resolver.doResolve(
                            target,
                            { ...request, path: override },
                            `redirected to: ${override}`,
                            resolveContext,
                            callback,
                        );
                    });
            },
        }],
    },
    module: {
        rules: [
            {
                oneOf: [
                    // overlay script
                    {
                        test: /overlay\.(?:js|css)$/,
                        type: 'asset/source',
                    },
                    // process svg
                    {
                        test: /\.svg$/,
                        type: 'asset/inline',
                        generator: {
                            dataUrl: (content) => svgToMiniDataURI(content.toString()),
                        },
                    },
                    // resolve wasm files
                    {
                        test: /\.wasm$/,
                        type: 'javascript/auto',
                        use: require.resolve('./helpers/wasm-loader'),
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
                ],
            },
        ],
    },
};