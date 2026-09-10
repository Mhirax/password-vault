import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from './app.js';
import { prisma } from './prisma.js';

async function signup(server, body) {
  const { port } = server.address();
  return fetch(`http://localhost:${port}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /auth/signup creates a user and never echoes the auth proof', async () => {
  const server = app.listen(0);
  const username = `test-${randomUUID()}`;
  try {
    const res = await signup(server, { username, kdfSalt: 'salt123', authProof: 'proof123' });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.username, username);
    assert.ok(body.id);
    assert.equal(body.authProof, undefined);
    assert.equal(body.kdfSalt, undefined);
  } finally {
    await prisma.user.deleteMany({ where: { username } });
    server.close();
  }
});

test('POST /auth/signup rejects a duplicate username', async () => {
  const server = app.listen(0);
  const username = `test-${randomUUID()}`;
  try {
    const first = await signup(server, { username, kdfSalt: 'salt123', authProof: 'proof123' });
    assert.equal(first.status, 201);

    const second = await signup(server, { username, kdfSalt: 'salt456', authProof: 'proof456' });
    assert.equal(second.status, 409);
  } finally {
    await prisma.user.deleteMany({ where: { username } });
    server.close();
  }
});

test('POST /auth/signup rejects a missing field', async () => {
  const server = app.listen(0);
  try {
    const res = await signup(server, { username: 'no-fields-test', kdfSalt: 'salt123' });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});
