import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRenderLimits } from '../src/core/Renderer.js';

test('graphics presets change internal pixels without changing CSS layout', () => {
  assert.deepEqual(resolveRenderLimits('performance',1440,810),{cssWidth:1440,cssHeight:810,internalWidth:720,internalHeight:405});
  assert.deepEqual(resolveRenderLimits('balanced',1440,810),{cssWidth:1440,cssHeight:810,internalWidth:960,internalHeight:540});
  assert.deepEqual(resolveRenderLimits('cinematic',1440,810),{cssWidth:1440,cssHeight:810,internalWidth:1280,internalHeight:720});
  assert.deepEqual(resolveRenderLimits('unknown',390,844),{cssWidth:390,cssHeight:844,internalWidth:249,internalHeight:540});
  assert.deepEqual(resolveRenderLimits('__proto__',390,844),{cssWidth:390,cssHeight:844,internalWidth:249,internalHeight:540});
});
