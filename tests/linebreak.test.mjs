import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);

const { outputText } = ts.transpileModule(
  readFileSync(new URL('../src/components/linebreak.tsx', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }
);
const compiled = { exports: {} };
runInNewContext(outputText, { module: compiled, exports: compiled.exports, require });
const LineBreaker = compiled.exports.default;

test('adds Japanese break opportunities without requiring a DOM', () => {
  const html = renderToStaticMarkup(React.createElement(LineBreaker, { text: '今日は天気です。' }));
  assert.match(html, /今日は<wbr\/>天気です。/);
});

test('renders markup in lyrics as literal text', () => {
  const html = renderToStaticMarkup(React.createElement(LineBreaker, { text: '<img src=x onerror=alert(1)>' }));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;'));
  assert.ok(html.includes('&gt;'));
});

test('accepts empty lyrics', () => {
  const html = renderToStaticMarkup(React.createElement(LineBreaker, { text: '' }));
  assert.ok(!html.includes('<wbr'));
});
