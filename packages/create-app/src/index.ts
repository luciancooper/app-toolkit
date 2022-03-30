#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import minimist from 'minimist';
import spawn from 'cross-spawn';
import inquirer from 'inquirer';
import semver from 'semver';
import spdxCorrect from 'spdx-correct';
import validateName from './validate-name';
import validateDirectory from './validate-directory';
import detectYarn from './detect-yarn';
import gitConfig from './git-config';
import createLicense from './create-license';
import createPackageJson from './write-package-json';
import install from './install';
import fetchLatestVersion from './latest-version';
import getVersion from './version';

function copyFile(src: string, dest: string, transform?: (content: string) => string) {
    let file = fs.readFileSync(src, 'utf8');
    if (transform) file = transform(file);
    fs.writeFileSync(dest, file);
}

async function main(args: string[]) {
    const version = getVersion();
    // const pkg = await import('../package.json');
    // check for version flag (-version / -v)
    if (args.some((arg) => /^-{1,2}v(?:ersion)?$/.test(arg))) {
        // print version and exit
        console.log(version);
        // return exit code 0
        return 0;
    }
    // check for help flag (-help / -h)
    if (args.some((arg) => /^-{1,2}h(?:elp)?$/.test(arg))) {
        // print usage instructions and exit
        console.log([
            chalk`{bold.magenta @lcooper/create-app} ({bold v${version}})`,
            '',
            chalk`  {bold.underline Usage:}`,
            chalk`    {cyan create-app} {green <project-name>}`,
            '',
            chalk`  {bold.underline Options:}`,
            chalk`    {cyan -h --help}        Show this message.`,
            chalk`    {cyan -v --version}     Show version.`,
        ].join('\n'));
        // return exit code 0
        return 0;
    }
    // parse args
    const { _: [projectName] } = minimist(args),
        root = path.resolve(projectName ?? '.'),
        appName = path.basename(root);

    // validate app name
    validateName(appName);

    // validate app directory
    validateDirectory(root);

    console.log(chalk`🎉  {bold Creating a new app {green ${appName}} in {cyan ${root}}}\n`);

    const { git, yarn = false, scss } = await inquirer.prompt<{
        git: boolean
        yarn: boolean
        scss: boolean
    }>([
        {
            type: 'confirm',
            name: 'git',
            message: 'Initialize a git repository?',
            default: true,
        },
        // if user has yarn installed, ask if they would like to use it
        {
            type: 'confirm',
            name: 'yarn',
            message: 'Use yarn?',
            default: true,
            when: detectYarn(),
        },
        {
            type: 'confirm',
            name: 'scss',
            message: 'Include scss styling?',
            default: true,
        },
    ]);

    // get default author & email from git config
    let defaultAuthor = '',
        defaultAuthorEmail = '';
    ({ user: { name: defaultAuthor = '', email: defaultAuthorEmail = '' } = {} } = gitConfig() ?? {});

    if (git) {
        // initialize git repository
        try {
            spawn.sync('git', ['init'], { cwd: root, stdio: 'ignore' });
            // copy gitignore
            copyFile(
                path.resolve(__dirname, './template/gitignore'),
                path.resolve(root, './.gitignore'),
            );
        } catch (e) {
            console.warn(chalk`\n{bold.yellow Warning:} could not initialize git repo repository\n`);
        }
    }

    console.log(chalk`\nCreating {yellow package.json}:\n`);

    // prompt user for package.json info
    const {
        author,
        license,
        licenseFile,
        ...packageInfo
    } = await inquirer.prompt<{
        name: string
        version: string
        isPrivate: boolean
        description: string
        keywords: string
        repository: string
        author: string
        authorEmail: string
        license: string
        licenseFile: boolean
    }>([
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
            name: 'repository',
            message: 'Repository URL',
            when: () => git,
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
        await createLicense(root, spdxCorrect(license)!, author);
    }

    // write package.json file
    createPackageJson(root, {
        ...packageInfo,
        author,
        license: (license && spdxCorrect(license)) ?? undefined,
        scripts: {
            build: 'app-scripts build',
            dev: 'app-scripts dev',
        },
        eslintConfig: {
            extends: '@lcooper/eslint-config',
        },
        stylelint: scss ? {
            extends: '@lcooper/stylelint-config-scss',
        } : undefined,
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

    // create src directory
    fs.mkdirSync(path.join(root, 'src'));
    // copy template app.config.js
    copyFile(
        path.resolve(__dirname, './template/app.config.js'),
        path.resolve(root, './app.config.js'),
    );
    // copy template src/index.js
    copyFile(
        path.resolve(__dirname, './template/src/index.js'),
        path.resolve(root, './src/index.js'),
        (file) => file.replace(/^\/\/ (import '\.\/index\.scss';\n)/m, scss ? '$1' : ''),
    );
    // copy template src/.eslintrc.js
    copyFile(
        path.resolve(__dirname, './template/src/.eslintrc.js'),
        path.resolve(root, './src/.eslintrc.js'),
    );
    // copy template src/index.scss
    if (scss) {
        copyFile(
            path.resolve(__dirname, './template/src/index.scss'),
            path.resolve(root, './src/index.scss'),
        );
    }
    // copy template src/index.html
    copyFile(
        path.resolve(__dirname, './template/src/index.html'),
        path.resolve(root, './src/index.html'),
        (file) => file.replace(/%TITLE%/, appName),
    );

    // fetch latest app-scripts version
    let scriptsVersion = await fetchLatestVersion('@lcooper/app-scripts');
    scriptsVersion = scriptsVersion ? `@^${scriptsVersion}` : '';

    // install dependencies
    console.log(chalk.bold('\nInstalling dependencies\n'));

    await install(root, [
        'react',
        'react-dom',
    ], yarn, false);

    // install dev dependencies
    console.log(chalk.bold('\nInstalling devDependencies\n'));

    await install(root, [
        `@lcooper/app-scripts${scriptsVersion}`,
        '@lcooper/eslint-config',
        '@lcooper/eslint-config-react',
        'eslint',
        'eslint-plugin-import',
        'eslint-plugin-jsdoc',
        'eslint-plugin-react',
        'eslint-plugin-react-hooks',
        ...scss ? [
            'stylelint',
            '@lcooper/stylelint-config-scss',
        ] : [],
    ], yarn, true);

    // finish
    return 0;
}

// run
main(process.argv.slice(2)).then(
    (code) => {
        process.exit(code);
    },
    (error: Error) => {
        console.log(chalk`{bold.red Error} ${error.message}`);
        process.exit(1);
    },
);