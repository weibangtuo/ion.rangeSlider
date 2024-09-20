import globals from 'globals'
import pluginJs from '@eslint/js'


export default [
  {
    languageOptions: {
      globals: globals.browser
    }
  },
  pluginJs.configs.recommended,
  {
    rules: {
      'no-var': 'error',
      'no-void': 'error',
      indent: ['error', 2, {
        ArrayExpression: 1,
        CallExpression: { arguments: 1 },
        FunctionDeclaration: { parameters: 'first' },
        ImportDeclaration: 'first',
        MemberExpression: 1,
        ObjectExpression: 1,
        SwitchCase: 1
      }],
      'key-spacing': ['error', { afterColon: true, beforeColon: false, mode: 'strict' }],
      'keyword-spacing': ['error', { after: true, before: true }],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
    }
  }
]