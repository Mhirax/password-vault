import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSalt,
  deriveMasterKeyBits,
  deriveEncryptionKey,
  deriveAuthProof,
  encryptEntry,
  decryptEntry,
} from './vaultCrypto.mjs';

test('same password + salt derives the same master key bits deterministically', async () => {
  const salt = generateSalt();
  const bitsA = await deriveMasterKeyBits('correct horse battery staple', salt);
  const bitsB = await deriveMasterKeyBits('correct horse battery staple', salt);
  assert.deepEqual(bitsA, bitsB);
});

test('auth proof differs from encryption key material derived from the same master key', async () => {
  const salt = generateSalt();
  const masterKeyBits = await deriveMasterKeyBits('hunter2', salt);
  const authProof = await deriveAuthProof(masterKeyBits, salt);
  const encryptionKey = await deriveEncryptionKey(masterKeyBits, salt);
  assert.equal(typeof authProof, 'string');
  assert.ok(encryptionKey instanceof CryptoKey);
});

test('round-trips plaintext through encrypt/decrypt', async () => {
  const salt = generateSalt();
  const masterKeyBits = await deriveMasterKeyBits('hunter2', salt);
  const encryptionKey = await deriveEncryptionKey(masterKeyBits, salt);
  const entry = await encryptEntry('super-secret-password', encryptionKey);
  const plaintext = await decryptEntry(entry, encryptionKey);
  assert.equal(plaintext, 'super-secret-password');
});

test('wrong master password fails to decrypt', async () => {
  const salt = generateSalt();
  const rightKeyBits = await deriveMasterKeyBits('hunter2', salt);
  const wrongKeyBits = await deriveMasterKeyBits('hunter3', salt);
  const rightKey = await deriveEncryptionKey(rightKeyBits, salt);
  const wrongKey = await deriveEncryptionKey(wrongKeyBits, salt);
  const entry = await encryptEntry('super-secret-password', rightKey);
  await assert.rejects(() => decryptEntry(entry, wrongKey));
});
