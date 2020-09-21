const chalk = require('chalk');

const [, , mode = 'production'] = process.argv;

console.log(chalk`📦  {bold Building app in {blue ${mode}} mode}`);