const middleware = require('./lib/dev-middleware'),
    configFactory = require('./config/webpack.config');

module.exports = (options) => {
    const config = configFactory('development');
    return middleware(config, options);
};