import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './app.js';

test('GET /health reports ok when the database is reachable', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(body, { status: 'ok', db: 'connected' });
  } finally {
    server.close();
  }
});
