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
                    configFile: '../tsconfig.bundle.json'
                },
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    externals: [
        {
            'zlib-sync': 'undefined'
        },
        /voice/
    ],
    output: {
        path: path.resolve(__dirname, '../bundle'),
        filename: 'Runtime.js',
        library: {
            type: 'commonjs2',
            export: 'default'
        }
    }
};
