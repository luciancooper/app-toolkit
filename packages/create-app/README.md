# @lcooper/create-app

[![npm][npm-badge]][npm-link]
[![license][license-badge]][license-link]

A tool to generate single page React apps with no configuration. Inspired by [create-react-app](https://github.com/facebookincubator/create-react-app)

## Usage

Use npx:

```bash
npx @lcooper/create-app new-app
```

Or install globally:

```bash
npm i @lcooper/create-app -g
```

Then run:

```bash
create-app new-app
```

## File Structure

Running either of the above commands will create a directory called `new-app` inside the current working directory, and generate the following initial project structure:

```
new-app
├── .gitignore
├── app.config.js
├── LICENSE
├── package.json
├── node_modules
└── src
    ├── .eslintrc.js
    ├── index.html
    ├── index.js
    └── index.scss
```

## Scripts

The following scripts are included in each new app:

### `build`

Run using **`npm run build`** or **`yarn build`**.

Builds the app in production mode into an output folder named `dist`. Files are minified and file names are hashed.

### `dev`

Run using **`npm run dev`** or **`yarn dev`**.

Runs the app in development mode using a development server that runs on port `3000` by default. 

Errors and warnings will be displayed in the console, and shown in the browser via an error overlay.

[`react-refresh`](https://www.npmjs.com/package/react-refresh) is integrated via [`@pmmmwh/react-refresh-webpack-plugin`](https://www.npmjs.com/package/@pmmmwh/react-refresh-webpack-plugin).

## Related

[`@lcooper/app-scripts`](https://www.npmjs.com/package/@lcooper/app-scripts) - App scripts and configuration.\
[`@lcooper/webpack-messages`](https://www.npmjs.com/package/@lcooper/webpack-messages) - Webpack error and warning message formatter.\
[`@lcooper/dev-server`](https://www.npmjs.com/package/@lcooper/dev-server) - Development server with HMR.\
[`@lcooper/dev-overlay`](https://www.npmjs.com/package/@lcooper/dev-overlay) - Overlay that displays errors and warnings in the browser.

[npm-link]: https://www.npmjs.com/package/@lcooper/create-app
[npm-badge]: https://img.shields.io/npm/v/@lcooper/create-app?logo=npm&style=for-the-badge
[license-link]: LICENSE
[license-badge]: https://img.shields.io/npm/l/@lcooper/create-app?color=brightgreen&style=for-the-badge