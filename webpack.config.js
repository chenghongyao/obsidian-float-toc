const path = require('path');
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
    entry: './src/main.ts',
    output: {
        path: __dirname,
        filename: 'main.js',
        libraryTarget: 'commonjs'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.vue$/,
                use: 'vue-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader' ],
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.vue'],
    },
    externals: {
        obsidian: 'obsidian',
    },
    plugins: [
        new VueLoaderPlugin(),
    ]
};