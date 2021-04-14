import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import {terser} from 'rollup-plugin-terser';

export default [
  {
    input: './src/vendor.ts',
    plugins: [
      nodeResolve({
        mainFields: ['module', 'jsnext'],
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      }),
      typescript(),
      commonjs(),
      // terser(),
    ],
    output: [
      {
        file: 'dist/vendor.js',
        format: 'iife',
      },
    ],
    onwarn: function (warning) {
      if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
      }
      process.stdout.write(`${warning.message}\n\n`);
    },
  },
  {
    input: './src/decimalJS_JJ.ts',
    plugins: [
      nodeResolve({
        mainFields: ['module', 'jsnext'],
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      }),
      typescript(),
      commonjs(),
      // terser(),
    ],
    output: [
      {
        file: 'dist/decimalJS_JJ.js',
        format: 'umd',
        exports: 'named',
        name: 'bundle',
      },
    ],
    onwarn: function (warning) {
      if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
      }
      process.stdout.write(`${warning.message}\n\n`);
    },
  },
  // {
  //   input: './src/decimalJS_BigInt.ts',
  //   plugins: [
  //     nodeResolve({
  //       mainFields: ['module', 'jsnext'],
  //       extensions: ['.ts', '.tsx', '.js', '.jsx'],
  //     }),
  //     typescript(),
  //     commonjs(),
  //     // terser(),
  //   ],
  //   output: [
  //     {
  //       file: 'dist/decimalJS_BigInt.js',
  //       format: 'umd',
  //       exports: 'named',
  //       name: 'bundle',
  //     },
  //   ],
  //   onwarn: function (warning) {
  //     if (warning.code === 'THIS_IS_UNDEFINED') {
  //       return;
  //     }
  //     process.stdout.write(`${warning.message}\n\n`);
  //   },
  // },
  // {
  //   input: './src/control.ts',
  //   plugins: [
  //     nodeResolve({
  //       mainFields: ['module', 'jsnext'],
  //       extensions: ['.ts', '.tsx', '.js', '.jsx'],
  //     }),
  //     typescript(),
  //     commonjs(),
  //     // terser(),
  //   ],
  //   output: [
  //     {
  //       file: 'dist/control.js',
  //       format: 'umd',
  //       exports: 'named',
  //       name: 'bundle',
  //     },
  //   ],
  //   onwarn: function (warning) {
  //     if (warning.code === 'THIS_IS_UNDEFINED') {
  //       return;
  //     }
  //     process.stdout.write(`${warning.message}\n\n`);
  //   },
  // },
];
