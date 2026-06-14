import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS } from '../js/presets.js';
import { EXAMPLES } from '../js/examples.js';

test('every preset has an example with image and output', () => {
  for (const key of Object.keys(PRESETS)) {
    const ex = EXAMPLES[key];
    assert.ok(ex, `missing EXAMPLES entry for preset "${key}"`);
    assert.ok(ex.image, `missing image for preset "${key}"`);
    assert.ok(ex.output, `missing output for preset "${key}"`);
  }
});
