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

### Integration with ESLint and stylelint

This tool works best on ESLint and stylelint errors when integrated with ESLint via a custom [eslint formatter](https://eslint.org/docs/user-guide/formatters/) and with stylelint via a custom [stylelint formatter](https://stylelint.io/developer-guide/formatters).

To integrate with ESLint, add the following to your [`eslint-webpack-plugin`](https://github.com/webpack-contrib/eslint-webpack-plugin) setup in your webpack config:

```js
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
    // ... other webpack config options ...
    plugins: [
        // ... other plugins ...
        new ESLintPlugin({
            // ... other eslint-webpack-plugin options ...
            formatter: require.resolve('@lcooper/webpack-messages/eslint-formatter'),
        }),
    ],
    // ...
};
```

To integrate with stylelint, add the following to your [`stylelint-webpack-plugin`](https://github.com/webpack-contrib/stylelint-webpack-plugin) setup in your webpack config:

```js
const StylelintPlugin = require('stylelint-webpack-plugin');

module.exports = {
    // ... other webpack config options ...
    plugins: [
        // ... other plugins ...
        new StylelintPlugin({
            // ... other stylelint-webpack-plugin options ...
            formatter: require('@lcooper/webpack-messages/stylelint-formatter'),
        }),
    ],
    // ...
};
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