const path = require('path');

module.exports = {
    entry: './Runtime.ts',
    target: 'node',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: '../tsconfig.json'
                },
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    externals: {
        'ffmpeg-static': 'undefined',
        'zlib-sync': 'undefined'
    },
    output: {
        path: path.resolve(__dirname, '../out'),
        filename: 'Runtime.js',
        library: {
            type: 'commonjs2',
            export: 'default'
        }
    }
};