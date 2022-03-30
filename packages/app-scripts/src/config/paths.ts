import path from 'path';
import fs from 'fs';

export const root = fs.realpathSync(process.cwd());
export const nodeModules = path.resolve(root, './node_modules');
export const configPath = path.resolve(root, './app.config.js');