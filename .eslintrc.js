module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jasmine: true,
    jest: true,
    mocha: true,
    node: true
  },
  extends: ["eslint:recommended", "prettier"],
  plugins: ["prettier"],
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module"
  }
};
