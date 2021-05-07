const path = require('path');

module.exports = {
    entry: './src/cli/main.ts',
    target: 'node',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.bundle.json'
                },
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        path: path.resolve(__dirname, 'bundle'),
        filename: 'exclaim.js'
    },
    optimization: {
        minimize: false
    }
};
