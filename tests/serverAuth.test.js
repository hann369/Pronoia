import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { signState, verifyState, verifyTelegramInitData, checkWebhookSecret } from '@/lib/serverAuth';

beforeAll(() => {
  process.env.WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.TELEGRAM_BOT_TOKEN = '123456:TEST_BOT_TOKEN';
});

describe('checkWebhookSecret', () => {
  it('accepts the configured secret and rejects others', () => {
    expect(checkWebhookSecret('test-webhook-secret')).toBe(true);
    expect(checkWebhookSecret('wrong')).toBe(false);
    expect(checkWebhookSecret(undefined)).toBe(false);
  });
});

describe('signState / verifyState', () => {
  it('round-trips a payload', () => {
    const token = signState({ uid: 'user-123' });
    expect(token).toBeTruthy();
    expect(verifyState(token)).toEqual({ uid: 'user-123' });
  });

  it('rejects a tampered token', () => {
    const token = signState({ uid: 'user-123' });
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(verifyState(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signState({ uid: 'x' }, -1); // already expired
    expect(verifyState(token)).toBeNull();
  });
});

describe('verifyTelegramInitData', () => {
  function buildInitData(token, fields) {
    const params = new URLSearchParams(fields);
    const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dcs).digest('hex');
    params.set('hash', hash);
    return params.toString();
  }

  it('accepts genuine signed initData and returns the user', () => {
    const token = '123456:TEST_BOT_TOKEN';
    const initData = buildInitData(token, {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, username: 'tester' }),
    });
    const result = verifyTelegramInitData(initData);
    expect(result?.user?.id).toBe(42);
  });

  it('rejects forged initData', () => {
    const initData = 'auth_date=1&user=%7B%22id%22%3A1%7D&hash=deadbeef';
    expect(verifyTelegramInitData(initData)).toBeNull();
  });
});
