// Verifies the per-recipient message encryption (ECIES) that the rebuilt chat
// relies on. lib/crypto.js is browser-oriented, so we provide a window shim
// backed by Node's WebCrypto before importing it.
import { describe, it, expect, beforeAll } from 'vitest';

let crypto;

beforeAll(async () => {
  globalThis.window = {
    crypto: globalThis.crypto,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  };
  crypto = await import('@/lib/crypto');
});

describe('eciesEncryptText / eciesDecryptText', () => {
  it('round-trips a message for one recipient', async () => {
    const recipient = await crypto.generateKeyPair();
    const enc = await crypto.eciesEncryptText('Hallo Hermes! äöü 🔒', recipient.publicKey);

    expect(enc.ct).toBeTruthy();
    expect(enc.iv).toBeTruthy();
    expect(enc.ephemPub?.x).toBeTruthy();

    const plain = await crypto.eciesDecryptText(enc, recipient.privateKey);
    expect(plain).toBe('Hallo Hermes! äöü 🔒');
  });

  it('per-recipient ciphers are independent — each participant decrypts only their own', async () => {
    const alice = await crypto.generateKeyPair();
    const bob = await crypto.generateKeyPair();

    const ciphers = {
      alice: await crypto.eciesEncryptText('geheim', alice.publicKey),
      bob: await crypto.eciesEncryptText('geheim', bob.publicKey),
    };

    expect(await crypto.eciesDecryptText(ciphers.alice, alice.privateKey)).toBe('geheim');
    expect(await crypto.eciesDecryptText(ciphers.bob, bob.privateKey)).toBe('geheim');
    // Wrong key must fail, not return garbage:
    await expect(crypto.eciesDecryptText(ciphers.alice, bob.privateKey)).rejects.toThrow();
  });

  it('exported public JWK can be re-imported and used (the Firestore path)', async () => {
    const recipient = await crypto.generateKeyPair();
    const jwk = await crypto.exportPublicKey(recipient.publicKey);
    const imported = await crypto.importPublicKey(jwk);

    const enc = await crypto.eciesEncryptText('via Firestore JWK', imported);
    expect(await crypto.eciesDecryptText(enc, recipient.privateKey)).toBe('via Firestore JWK');
  });
});
