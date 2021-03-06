const path = require('path'),
    svgToMiniDataURI = require('mini-svg-data-uri');

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
            'overlay-js$': path.resolve(__dirname, './dist/overlay.js'),
            'overlay-css$': path.resolve(__dirname, './dist/overlay.css'),
        },
        plugins: [{
            // override requests to 'source-map/lib/read-wasm'
            apply(resolver) {
                const target = resolver.ensureHook('resolved'),
                    override = path.resolve(__dirname, './lib/read-wasm.js');
                resolver
                    .getHook('resolve')
                    .tapAsync('source-map-override', (request, resolveContext, callback) => {
                        // check if requested path is not 'source-map/lib/read-wasm'
                        if (!/\bsource-map\b/.test(request.path) || !/read-wasm$/.test(request.request)) {
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
                        use: 'raw-loader',
                    },
                    // process svg
                    {
                        test: /\.svg$/,
                        loader: 'url-loader',
                        options: {
                            generator(content) {
                                return svgToMiniDataURI(content.toString());
                            },
                        },
                    },
                    // resolve wasm files
                    {
                        test: /\.wasm$/,
                        type: 'javascript/auto',
                        use: require.resolve('./lib/wasm-loader'),
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