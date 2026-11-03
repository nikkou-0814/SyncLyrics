import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

// Core exports a DOM event subclass even when only its spring solver is used.
globalThis.MouseEvent = class extends Event {};
const { spring, Duration } = await import('@applemusic-like-lyrics/core');
delete globalThis.MouseEvent;

const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(
  readFileSync(new URL('../src/components/amll-lyrics.tsx', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }
);

function createRenderer() {
  // Keep hook state across playback renders without mounting the DOM player.
  const slots = [];
  let cursor = 0;
  const LyricPlayer = () => null;
  const compiled = { exports: {} };
  runInNewContext(outputText, {
    module: compiled,
    exports: compiled.exports,
    require(id) {
      if (id === 'react') return {
        ...React,
        useState: initial => [initial, () => {}],
        useEffect: () => {},
        useMemo(factory, deps) {
          const index = cursor++;
          const previous = slots[index];
          if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
            slots[index] = { deps, value: factory() };
          }
          return slots[index].value;
        },
      };
      if (id === '@applemusic-like-lyrics/react') return { LyricPlayer };
      if (id.endsWith('.css')) return {};
      return require(id);
    },
  });

  return (currentTime, amllSpringParams) => {
    cursor = 0;
    const tree = compiled.exports.default({
      currentTime,
      ttmlData: { agents: [], divs: [] },
      settings: { fontSize: 'medium', lyricposition: 'left', amllSpringParams },
      onLyricClick: () => {},
      isMobile: false,
      isPlaying: true,
      resolvedTheme: 'dark',
    });
    const player = tree.props.children.props.children;
    assert.equal(player.type, LyricPlayer);
    return player.props;
  };
}

test('AMLL delayed scroll survives playback renders at 50 ms intervals', () => {
  const render = createRenderer();
  const params = { mass: 1, tension: 280, friction: 60 };
  let props = render(0, params);
  const position = new spring.Spring(0);
  position.updateParams(props.linePosYSpringParams);
  position.setTargetPosition(-100, Duration.fromMillis(150));

  for (let frame = 1; frame <= 120; frame++) {
    position.update(Duration.fromMillis(1000 / 60));
    if (frame % 3 === 0) {
      const next = render(frame / 60, { ...params });
      // Match the React binding's effect when the parameter prop changes.
      if (next.linePosYSpringParams !== props.linePosYSpringParams) {
        position.updateParams(next.linePosYSpringParams);
      }
      props = next;
    }
  }

  assert.ok(position.getCurrentPosition() < -99, 'lyrics must reach the next scroll position');
});

test('AMLL spring settings still update when their values change', () => {
  const render = createRenderer();
  const initial = render(0, undefined);
  assert.equal(initial.linePosYSpringParams.stiffness, 300);
  const changed = render(1, { mass: 2, tension: 240, friction: 40 });
  assert.notEqual(changed.linePosYSpringParams, initial.linePosYSpringParams);
  assert.equal(changed.linePosYSpringParams.mass, 2);
  assert.equal(changed.linePosYSpringParams.stiffness, 240);
  assert.equal(changed.linePosYSpringParams.damping, 40);
  assert.equal(changed.linePosXSpringParams, changed.linePosYSpringParams);
  assert.equal(changed.lineScaleSpringParams, changed.linePosYSpringParams);
});
