# @lcooper/dev-server

[![npm][npm-badge]][npm-link]
[![license][license-badge]][license-link]

A development server for [webpack](https://webpack.js.org) that provides hot reloading and an error overlay. Inspired by [webpack-dev-server](https://github.com/webpack/webpack-dev-server) and [webpack-hot-middleware](https://github.com/webpack-contrib/webpack-hot-middleware).

## Installation

Install with npm:

```bash
npm install @lcooper/dev-server --save-dev
```

Or with yarn:

```bash
yarn add @lcooper/dev-server --dev
```

## Usage

```js
const DevServer = require('@lcooper/dev-server');

const server = new DevServer(/* webpack config */, {
    // dev-server options
});

server.listen({ port: 3000, open: true }, (port) => {
    console.log(`dev-server is listening on port ${port}`);
});

// safely close the server on termination
process.on('SIGINT', () => {
    server.close(() => {
        process.exit(1);
    });
});
```

### Middleware

This package can also be used as an express middleware that can be integrated into an existing express server. This functionality can be imported from `@lcooper/dev-server/middleware`.

Ensure that the middleware is properly closed, as demonstrated in the following example:

```js
const express = require('express'),
    devMiddleware = require('@lcooper/dev-server/middleware');

const app = express(),
    // middleware instance
    middleware = devMiddleware(/* webpack config */, {
        // dev-server options
    }),
    // function to properly close middleware
    closeMiddlware = () => {
        middleware.close(() => {
            process.exit(1);
        });
    };

app.use(middleware);

const server = app.listen(3000, () => {
    console.log('Express app is listening on port 3000');
});

server.on('error', closeMiddlware);
process.on('SIGINT', closeMiddlware);
```

### Integration with `react-refresh`

Fast refresh can be integrated using [`@pmmmwh/react-refresh-webpack-plugin`](https://github.com/pmmmwh/react-refresh-webpack-plugin). Add the following to your webpack config:

```js
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
    // ... other webpack config options ...
    module: {
        rules: [
            // ... other rules ...
            {
                test: /\.(?:js|mjs|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    // ... other babel options ...
                    plugins: [
                        // ... other babel plugins ...
                        'react-refresh/babel',
                    ],
                },
            },
        ],
    },
    plugins: [
        // ... other plugins ...
        new ReactRefreshPlugin({
            overlay: false, // disable overlay (this is required)
        }),
    ],
};
```

## API

### `new DevServer(config, [options])`

Instantiate a new dev server instance.

 - `config` - webpack config object
 - `options` - dev server [options](#options)

### `devServer.listen(options, [callback])`

Instructs the server to start listening for connections.

 - `options`: options object
 - `options.port`: `number` (default `3000`) - target port to listen on
 - `options.open`: `boolean` (default: `true`) - open browser on server start
 - `callback`: function to call when server starts listening

### `devServer.close([callback])`

Shut down the server and stop watching for file changes.

 - `callback` - function to call when server has been closed

## Options

### `interactive`

Type: `boolean`\
Default: `false` 

Enable interactive mode, where the console is cleared each time the bundle is compiled

### `path`

Type: `string`\
Default: `'/__dev-server'`

Path on which to serve the event stream

### `heartbeat`

Type: `number`\
Default: `10000`

Interval to send updates to the client to keep the connection alive

## Related

[`@lcooper/create-app`](https://www.npmjs.com/package/@lcooper/create-app) - Tool for creating React apps with no configuration.\
[`@lcooper/app-scripts`](https://www.npmjs.com/package/@lcooper/app-scripts) - Web app scripts and configuration.\
[`@lcooper/webpack-messages`](https://www.npmjs.com/package/@lcooper/webpack-messages) - Utility used to extract and prettify webpack error and warning messages.\
[`@lcooper/dev-overlay`](https://www.npmjs.com/package/@lcooper/dev-overlay) - Overlay used to display errors and warnings in the browser.

[npm-link]: https://www.npmjs.com/package/@lcooper/dev-server
[npm-badge]: https://img.shields.io/npm/v/@lcooper/dev-server?logo=npm&style=for-the-badge
[license-link]: LICENSE
[license-badge]: https://img.shields.io/npm/l/@lcooper/dev-server?color=brightgreen&style=for-the-badge