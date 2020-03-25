module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [7006, 2349]
      },
      "babelConfig": {
        "presets": ["power-assert"]
      }
    }
  }
};