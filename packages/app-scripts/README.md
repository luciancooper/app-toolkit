# @lcooper/app-scripts

[![npm][npm-badge]][npm-link]
[![license][license-badge]][license-link]

## Usage

Create a new app using [`@lcooper/create-app`](https://www.npmjs.com/package/@lcooper/create-app), or follow the instructions below to set up manually

First, install `@lcooper/app-scripts` as a dev dependency:

```bash
npm i @lcooper/app-scripts --save-dev
```

or using `yarn`:

```bash
yarn add @lcooper/app-scripts --dev
```

Then add the following `scripts` to your package.json:

```json
{
  "scripts": {
    "build": "app-scripts build",
    "dev": "app-scripts dev"
  }
}
```

A project must include the following files to build correctly:

 * `src/index.js` - the javascript entry point for your app
 * `src/index.html` - the page template for your app

The names of these files can be specified by including a `app.config.js` file in the root of your project:

```js
module.exports = {
    entry: 'src/index.js',
    html: 'src/index.html',
};
```

Additionally, [`eslint`](https://eslint.org/) must be configured in your workspace

## Scripts

### `build`

Builds the app in production mode into an output folder named `dist`. Files are minified and file names are hashed.

### `dev`

Runs the app in development mode using a development server that runs on port `3000` by default. 

Errors and warnings will be printed in the console, and displayed in the browser via an error overlay.

[`react-refresh`](https://www.npmjs.com/package/react-refresh) is integrated via [`@pmmmwh/react-refresh-webpack-plugin`](https://www.npmjs.com/package/@pmmmwh/react-refresh-webpack-plugin).

## Middleware

The hot reloading and error overlay functionality of the `dev` script is also exposed as middleware that can be integrated into an express server. It can be imported from `@lcooper/app-scripts/middleware`. 

Ensure that the middleware instance is properly closed, as demonstrated in the following example:

```js
const express = require('express'),
    middleware = require('@lcooper/app-scripts/middleware');

const app = express(),
    // middleware instance
    devMiddleware = middleware(),
    // function to properly close middleware
    closeMiddlware = () => {
        devMiddleware.close(() => {
            process.exit(1);
        });
    };

app.use(devMiddleware);

// listen on port 3000
const server = app.listen(3000, () => {
    console.log('Express app is listening on port 3000');
});

server.on('error', closeMiddlware);

process.on('SIGINT', closeMiddlware);
process.on('SIGTERM', closeMiddlware);
```

## Related

[`@lcooper/create-app`](https://www.npmjs.com/package/@lcooper/create-app) - Tool for generating single page React apps that use this package.\
[`@lcooper/dev-server`](https://www.npmjs.com/package/@lcooper/dev-server) - Development server with HMR.\
[`@lcooper/webpack-messages`](https://www.npmjs.com/package/@lcooper/webpack-messages) - Webpack error and warning message formatter.\
[`@lcooper/dev-overlay`](https://www.npmjs.com/package/@lcooper/dev-overlay) - Overlay that displays errors and warnings in the browser.

[npm-link]: https://www.npmjs.com/package/@lcooper/app-scripts
[npm-badge]: https://img.shields.io/npm/v/@lcooper/app-scripts?logo=npm&style=for-the-badge
[license-link]: LICENSE
[license-badge]: https://img.shields.io/npm/l/@lcooper/app-scripts?color=brightgreen&style=for-the-badge