import path from 'path'
import webpack from 'webpack'
import AssetsPlugin from 'assets-webpack-plugin'
import nodeExternals from 'webpack-node-externals'
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer'
import overrideRules from './lib/overrideRules'
import pkg from '../package.json'

const isDebug = !process.argv.includes('--release')
const isVerbose = process.argv.includes('--verbose')
const isAnalyze =
  process.argv.includes('--analyze') || process.argv.includes('--analyse')

const reScript = /\.jsx?$/
const reStyle = /\.(css|less|scss|sss)$/
const reImage = /\.(bmp|gif|jpe?g|png|svg)$/
const staticAssetName = isDebug
  ? '[path][name].[ext]?[hash:8]'
  : '[hash:8].[ext]'

/**
 * common configuration chunk to be used for both
 * client-side (client.js) and server-side (server.js) bundles
 */
const config = {
  context: path.resolve(__dirname, '..'),

  output: {
    path: path.resolve(__dirname, '../build/public/assets'),
    publicPath: '/assets/',
    pathinfo: isVerbose,
    filename: isDebug ? '[name].js' : '[name].[chunkhash:8].js',
    chunkFilename: isDebug
      ? '[name].chunk.js'
      : '[name].[chunkhash:8].chunk.js',
    devtoolModuleFilenameTemplate: info =>
      path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
  },

  resolve: {
    // allow absolute paths in imports, e.g. import Button from 'components/Button'
    modules: ['node_modules', 'src']
  },

  module: {
    // make missing exports an error instead of warning
    strictExportPresence: true,

    rules: [
      // rules for JS/ JSX
      {
        test: reScript,
        loader: 'babel-loader',
        include: [path.resolve(__dirname, '../src')],
        options: {
          cacheDirectory: isDebug,
          babelrc: false,
          presets: [
            // a babel preset that can automatically determine the Babel plugins and polyfills
            [
              '@babel/preset-env',
              {
                targets: {
                  browsers: pkg.broserslist,
                  forceAllTransforms: !isDebug,   // for UglifyJs
                },
                modules: false,
                useBuiltIns: false,
                debug: false
              }
            ],
            '@babel/preset-stage-2',
            '@babel/preset-flow',
            [
              '@babel/preset-react',
              {
                development: isDebug
              }
            ]
          ],
          plugins: [
            // treat react jsx elements as value types and hoist them to the highest scope
            ...(isDebug ? [] : ['@babel/transform-react-constant-elements']),
            // replaces the React.createElement function with one that is more optimized for production
            ...(isDebug ? [] : ['@babel/transform-react-inline-elements']),
            // remove unnecessary React propTypes from the production build
            ...(isDebug ? [] : ['transform-react-remove-prop-types'])
          ]
        }
      },
      {
        test: /theme.scss$/,
        loaders: [
          'isomorphic-style-loader',
          `css-loader?${
            isDebug ? 'sourceMap&' : 'minimize&'
          }modules&localIdentName=[local]&importLoaders=2`,
          'sass-loader'
        ]
      },
      {
        test: reStyle,
        exclude: [/theme.scss$/],
        use: [
          'isomorphic-style-loader',
          `css-loader?${
            isDebug ? 'sourceMap&' : 'minimize&'
          }modules&localIdentName=
          ${
            isDebug ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]'
          }&importLoaders=2`,
          'sass-loader'
        ]
      },
      {
        test: reImage,
        oneOf: [
          // inline lightweight images into CSS
          {
            issue: reStyle,
            oneOf: [
              // inline lightweight SVGs as UTF-8 encoded DataUrl string
              {
                test: /\.svg$/,
                loader: 'svg-url-loader',
                options: {
                  name: staticAssetName,
                  limit: 4096
                }
              },
              // inline lightweight images as Base64 encoded DataUrl string
              {
                loader: 'url-loader',
                options: {
                  name: staticAssetName,
                  limit: 4096
                }
              }
            ]
          },
          // or return public URL to image resource
          {
            loader: 'file-loader',
            options: {
              name: staticAssetName
            }
          }
        ]
      },
      // convert plain text into JS module
      {
        test: /\.txt$/,
        loader: 'raw-loader'
      },
      // convert markdown to HTML
      {
        test: /\.md$/,
        loader: path.resolve(__dirname, './lib/markdown-loader.js')
      },
      // return public URL for all assets unless explicitly excluded
      // DO NOT FORGET to update `exclude` list when you adding a new loader
      {
        exclude: [reScript, reStyle, reImage, /\.json$/, /\.txt$/, /\.md$/],
        loader: 'file-loader',
        options: {
          name: staticAssetName
        }
      },

      // exclude dev modules from production build
      ...(isDebug
        ? []
        : [
          {
            test: path.resolve(
              __dirname,
              '../node_modules/react-deep-force-update/lib/index.js'
            ),
            loader: 'null-loader'
          }
        ])
    ]
  },

  // don't attempt to continue if there are any errors
  bail: !isDebug,

  cache: isDebug,

  // specify what bundle information gets displayed
  stats: {
    cached: isVerbose,
    cachedAssets: isVerbose,
    chunks: isVerbose,
    chunkModules: isVerbose,
    colors: true,
    hash: isVerbose,
    modules: isVerbose,
    reasons: isDebug,
    timings: true,
    version: isVerbose
  },

  // choose a developer tool to enhance debugging
  devtool: isDebug ? 'cheap-module-inline-source-map' : 'source-map'
}

/**
 * configuration for the client-side bundle (client.js)
 */

const clientConfig = {
  ...config,

  name: 'client',
  target: 'web',

  entry: {
    client: ['@babel/polyfill', './src/client.js']
  },

  plugins: [
    // define free variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': isDebug ? '"development"' : '"production"',
      'process.env.BROWSER': true,
      __DEV__ : isDebug
    }),

    // emit a file with assets paths
    new AssetsPlugin({
      path: path.resolve(__dirname, '../build'),
      filename: 'assets.json',
      prettyPrint: true
    }),

    // move modules that occur in multiple entry chunks to a new entry chunk (the commons chunk)
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: module => /node_modules/.test(module.resource)
    }),

    ...(isDebug
      ? []
      : [
        // decrease script evaluation time
        new webpack.optimize.ModuleConcatenationPlugin(),

        // minimize all javascript output of chunks
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            warnings: isVerbose,
            unused: true,
            dead_code: true,
            screw_ie8: true,
          },
          mangle: {
            screw_ie8: true
          },
          output: {
            comments: false,
            screw_ie8: true
          },
          sourceMap: true
        })
      ]),

    // webpack bundle analyzer
    ...(isAnalyze ? [new BundleAnalyzerPlugin()]: [])
  ],

  // some libraries import Node modules but don't use them in the browser
  // tell webpack to provide empty mocks for them so importing them works
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
}

/**
 * configuration for the server-side bundle (server.js)
 */
const serverConfig = {
  ...config,

  name: 'server',
  target: 'node',

  entry: {
    server: ['@babel/polyfill', './src/server.js']
  },

  output: {
    ...config.output,
    path: path.resolve(__dirname, '../build'),
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    libraryTarget: 'commonjs2'
  },

  // webpack mutates resolve object, so clone it to avoid issues
  resolve: {
    ...config.resolve
  },

  module: {
    ...config.module,

    rules: overrideRules(config.module.rules, rule => {
      // override babel-preset-env configuration for Node.js
      if (rule.loader === 'babel-loader') {
        return {
          ...rule,
          options: {
            ...rule.options,
            presets: rule.options.presets.map(
              preset =>
                preset[0] !== '@babel/preset-env'
                  ? preset
                  : [
                    '@babel/preset-env',
                    {
                      targets: {
                        node: pkg.engines.node.match(/(\d+\.?)+/)[0]
                      },
                      modules: false,
                      useBuiltIns: false,
                      debug: false
                    }
                  ]
            )
          }
        }
      }

      // override paths to static paths
      if (
        rule.loader === 'file-loader' ||
        rule.loader === 'url-loader' ||
        rule.loader === 'svg-url-loader'
      ) {
        return {
          ...rule,
          options: {
            ...rule.options,
            name: `public/assets/${rule.options.name}`,
            publicPath: url => url.replace(/^public/, '')
          }
        }
      }

      return rule
    })
  },

  externals: [
    './assets.json',
    nodeExternals({
      whitelist: [reStyle, reImage]
    })
  ],

  plugins: [
    // define free variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': isDebug ? '"development"': '"production"',
      'process.env.BROWSER': false,
      __DEV__: isDebug
    }),

    // adds a banner to the top of each generated chunk
    new webpack.BannerPlugin({
      banner: 'require("source-map-support").install()',
      raw: true,
      entryOnly: false
    }),
  ],

  // do not replace node globals with polyfills
  node: {
    console: false,
    global: false,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false
  }
}

export default [clientConfig, serverConfig]
