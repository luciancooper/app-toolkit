# @lcooper/webpack-messages

[![npm][npm-badge]][npm-link]
[![license][license-badge]][license-link]

A tool for extracting and prettifying error and warning messages from a webpack [stats](https://webpack.js.org/api/node/#stats-object) object for display in the console.

## Installation

Install with npm:

```bash
npm install @lcooper/webpack-messages --save-dev
```

Or with yarn:

```bash
yarn add @lcooper/webpack-messages --dev
```

## Usage

```js
const webpack = require('webpack'),
    webpackMessages = require('@lcooper/webpack-messages');

// create webpack compiler instance
const compiler = webpack(/* config */);

compiler.hooks.invalid.tap('invalid', () => {
    console.log('Compiling...');
});

compiler.hooks.done.tap('done', (stats) => {
    // format webpack error / warning messages
    const { errors, warnings } = webpackMessages(stats);
    // check for errors
    if (errors.length) {
        console.log('Failed to compile.');
        console.log(errors.join(''));
        return;
    }
    // check for warnings
    if (warnings.length) {
        console.log('Compiled with warnings.');
        console.log(warnings.join(''));
    } else {
        console.log('Compiled successfully');
    }
});
```

## API

### `webpackMessages(stats)`

Extract and format webpack error / warning messages

 - `stats` - a webpack [stats](https://webpack.js.org/api/node/#stats-object) object

Returns: `{ errors: string[], warnings: string[] }`.

Under the hood, this method simply calls `webpackMessages.extract` then `webpackMessages.format`

### `webpackMessages.extract(stats)`

Extract error / warning data from a webpack stats object.

- `stats` - a webpack [stats](https://webpack.js.org/api/node/#stats-object) object

Returns: `{ errors: Object[], warnings: Object[] }`.

### `webpackMessages.format(data)`

Transform error / warning data into formatted readable output strings.

 - `data` - extracted error / warning data from a call to `webpackMessages.extract(stats)`.

Returns: `{ errors: string[], warnings: string[] }`.

[npm-link]: https://www.npmjs.com/package/@lcooper/webpack-messages
[npm-badge]: https://img.shields.io/npm/v/@lcooper/webpack-messages?logo=npm&style=for-the-badge
[license-link]: LICENSE
[license-badge]: https://img.shields.io/npm/l/@lcooper/webpack-messages?color=brightgreen&style=for-the-badge