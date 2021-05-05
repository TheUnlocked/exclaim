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
                    configFile: './tsconfig.bundle.json'
                },
                exclude: /node_modules/
            },
            {
                test: /prism-media|Secretbox/,
                loader: 'null-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    externals: [
        {
            'zlib-sync': 'undefined'
        }
    ],
    output: {
        path: path.resolve(__dirname, '../bundle'),
        filename: 'Runtime.js',
        library: {
            type: 'commonjs2',
            export: 'default'
        }
    }
    // optimization: {
    //     minimize: false
    // }
};
