import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash } from '../app/js/lib/route.js';

test('parses known routes', () => {
  assert.deepEqual(parseHash(''), { name: 'home', id: null });
  assert.deepEqual(parseHash('#/'), { name: 'home', id: null });
  assert.deepEqual(parseHash('#/settings'), { name: 'settings', id: null });
  assert.deepEqual(parseHash('#/play/abc'), { name: 'play', id: 'abc' });
  assert.deepEqual(parseHash('#/build/a%20b'), { name: 'build', id: 'a b' });
  assert.deepEqual(parseHash('#/activity/x1'), { name: 'activity', id: 'x1' });
});

test('unknown or malformed routes are notfound', () => {
  for (const h of ['#/nope', '#/play', '#/play/a/b', '#/settings/x']) {
    assert.equal(parseHash(h).name, 'notfound', h);
  }
});

test('buildHash round-trips', () => {
  for (const [name, id] of [['home'], ['settings'], ['play', 'a b'], ['build', 'x'], ['activity', 'y']]) {
    const r = parseHash(buildHash(name, id));
    assert.equal(r.name, name);
    if (id) assert.equal(r.id, id);
  }
});
