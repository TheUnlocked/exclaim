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
        extensions: ['.ts', '.js'],
        // https://github.com/node-fetch/node-fetch/issues/450#issuecomment-494475397
        mainFields: ['main']
    },
    ignoreWarnings: [
        /^Module not found: Error: Can't resolve 'encoding'/
    ],
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
    },
    optimization: {
        minimize: false
    }
};
