const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require("path");
module.exports = function override(config, env) {
    // config.plugins.push(new BundleAnalyzerPlugin());
    if (process.env.BUILD_TARGET === "lib") {
        config.entry = [
            path.resolve(process.cwd(), "src", "libroot.js")
        ]

        config.output = {
            path: config.output.path,
            filename: 'treebox.js',
            library: "treebox",
            libraryTarget: "umd",
        }

        delete config.optimization["splitChunks"];
        delete config.optimization["runtimeChunk"];
        config.externals = ["react", "react-dom", "color"];
        config.plugins = config.plugins.filter(p => ["HtmlWebpackPlugin", "GenerateSW", "ManifestPlugin"].indexOf(p.constructor.name) < 0)
        config.plugins.filter(x => x.options && x.options.filename === 'static/css/[name].[contenthash:8].css').forEach(plugin => plugin.options.filename = "static/css/[name].css")
    }
    return config;
}