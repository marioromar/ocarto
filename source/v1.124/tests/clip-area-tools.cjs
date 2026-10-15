'use strict';
const assert = require('node:assert/strict');
const { clipAreaToArea, differenceConvexArea } = require('../topology-tools.js');

const square = [[0, 0], [4, 0], [4, 4], [0, 4]];
const clipped = clipAreaToArea(square, [[2, 1], [5, 1], [5, 3], [2, 3]]);
assert.deepEqual(clipped, [[2, 1], [4, 1], [4, 3], [2, 3]]);

// The clip ring may be clockwise; the result remains the same.
assert.deepEqual(clipAreaToArea(square, [[2, 3], [5, 3], [5, 1], [2, 1]]), clipped);
assert.deepEqual(clipAreaToArea(square, [[5, 1], [7, 1], [7, 3], [5, 3]]), []);

assert.throws(() => clipAreaToArea([[0, 0], [4, 0], [2, 1], [4, 4], [0, 4]], square), /convexas/);
assert.throws(() => clipAreaToArea(square, [[0, 0], [4, 0], [2, 1], [4, 4], [0, 4]]), /convexas/);
assert.throws(() => clipAreaToArea([[0, 0], [4, 4], [0, 4], [4, 0]], square), /área nula|auto-intersección/);

const outside = differenceConvexArea([[0, 0], [4, 0], [4, 4], [0, 4]], [[1, 1], [3, 1], [3, 3], [1, 3]]);
assert.equal(outside.length, 4, 'a central cut produces four disconnected outside pieces');
const area = ring => Math.abs(ring.reduce((sum, p, i) => sum + p[0] * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * p[1], 0) / 2);
assert.equal(outside.reduce((sum, ring) => sum + area(ring), 0), 12, 'outside pieces preserve the subject area minus the clip');
assert.ok(outside.every(ring => ring.length >= 3));
assert.throws(() => differenceConvexArea([[0, 0], [4, 0], [2, 1], [4, 4], [0, 4]], square), /convexas/);

console.log('✓ recorte seguro de áreas convexas');
