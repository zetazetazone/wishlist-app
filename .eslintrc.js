module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['i18next'],
  rules: {
    'i18next/no-literal-string': [
      'warn',
      {
        markupOnly: true,
        ignoreAttribute: [
          'testID',
          'name',
          'style',
          'source',
          'key',
          'type',
          'accessibilityRole',
          'href',
          'resizeMode',
          'contentFit',
          'behavior',
        ],
        ignoreComponent: ['Trans'],
      },
    ],
  },
};
