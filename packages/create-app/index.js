#!/usr/bin/env node
const path = require('path'),
    chalk = require('chalk'),
    minimist = require('minimist'),
    inquirer = require('inquirer'),
    semver = require('semver'),
    spdxCorrect = require('spdx-correct'),
    validateName = require('./lib/validate-name'),
    validateDirectory = require('./lib/validate-directory'),
    detectYarn = require('./lib/detect-yarn'),
    gitConfig = require('./lib/git-config'),
    createLicense = require('./lib/create-license'),
    createPackageJson = require('./lib/write-package-json'),
    install = require('./lib/install');

async function main(args) {
    // check for help flag (-help / -h)
    if (args.some((arg) => /^-{1,2}h(?:elp)?$/.test(arg))) {
        // print usage instructions and exit
        console.log(chalk`{bold Usage:}\n\n{cyan create-app} {green <project-name>}`);
        // return exit code 0
        return 0;
    }
    // parse args
    const { _: [projectName] } = minimist(args),
        root = path.resolve(projectName || '.'),
        appName = path.basename(root);

    // validate app name
    validateName(appName);

    // validate app directory
    validateDirectory(root);

    console.log(chalk`🎉  {bold Creating a new app {green ${appName}} in {cyan ${root}}}\n`);

    // if user has yarn installed, ask if they would like to use it
    const { yarn = false } = await inquirer.prompt([{
            type: 'confirm',
            name: 'yarn',
            message: 'Use yarn?',
            default: true,
            when: detectYarn(),
        }]),
        {
            user: {
                name: defaultAuthor = '',
                email: defaultAuthorEmail = '',
            } = {},
        } = gitConfig() || {};

    console.log(chalk`\nCreating {yellow package.json}:\n`);

    // prompt user for package.json info
    const {
        author,
        license,
        licenseFile,
        ...packageInfo
    } = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Package name',
            default: appName,
            validate: (value) => {
                try {
                    validateName(value);
                } catch ({ message }) {
                    return message;
                }
                return true;
            },
        },
        {
            type: 'input',
            name: 'version',
            message: 'Version',
            default: '0.0.0',
            validate: (value) => (
                semver.valid(value) ? true : 'Please enter a valid package version'
            ),
        },
        {
            type: 'confirm',
            name: 'isPrivate',
            message: 'Private',
            default: false,
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description',
        },
        {
            type: 'input',
            name: 'keywords',
            message: 'Keywords',
        },
        {
            type: 'input',
            name: 'author',
            message: 'Author Name',
            default: defaultAuthor,
        },
        {
            type: 'input',
            name: 'authorEmail',
            message: 'Author Email',
            default: defaultAuthorEmail,
            when: (answers) => answers.author,
        },
        {
            type: 'input',
            name: 'license',
            message: 'License',
            default: 'MIT',
            validate: (value) => (
                (value && spdxCorrect(value) == null)
                    ? 'Please enter a valid license identifier'
                    : true
            ),
        },
        {
            type: 'confirm',
            name: 'licenseFile',
            message: 'Create License File?',
            default: true,
            when: (answers) => (answers.license && answers.author),
        },
    ]);

    // write LICENSE file
    if (licenseFile) {
        await createLicense(root, spdxCorrect(license), author);
    }

    // write package.json file
    createPackageJson(root, {
        ...packageInfo,
        author,
        license: license ? spdxCorrect(license) : null,
        scripts: {
            build: 'app-scripts build',
            dev: 'app-scripts dev',
        },
        eslintConfig: {
            extends: '@lcooper/eslint-config',
        },
        browserslist: {
            production: [
                '>0.2%',
                'not dead',
                'not op_mini all',
            ],
            development: [
                'last 1 chrome version',
                'last 1 firefox version',
                'last 1 safari version',
            ],
        },
        dependencies: {},
        devDependencies: {},
    });

    // install dependencies
    console.log(chalk.bold('\nInstalling dependencies\n'));

    await install(root, [
        'react',
        'react-dom',
    ], yarn, false);

    // install dev dependencies
    console.log(chalk.bold('\nInstalling devDependencies\n'));

    await install(root, [
        '@lcooper/app-scripts',
        '@lcooper/eslint-config',
        '@lcooper/eslint-config-react',
        'eslint',
        'eslint-plugin-import',
        'eslint-plugin-jsdoc',
        'eslint-plugin-react',
    ], yarn, true);

    // finish
    return 0;
}

// run
main(process.argv.slice(2)).then(
    (code) => {
        process.exit(code);
    },
    (error) => {
        console.log(chalk`{bold.red Error} ${error.message}`);
        process.exit(1);
    },
);