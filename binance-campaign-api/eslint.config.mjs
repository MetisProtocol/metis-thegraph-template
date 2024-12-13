// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            'no-empty': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
        ignores: ['node_modules/**/*', 'jest.config.js'],
    },
);
