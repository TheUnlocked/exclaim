const path = require('path');

module.exports = {
    entry: './src/cli/main.ts',
    target: 'node',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'exclaim.js'
    }
};