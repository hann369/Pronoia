"""
hermes_e2e.py — E2E crypto for the Pronoia Hermes bridge.

This MUST stay byte-compatible with the browser implementation in
lib/crypto.js (WebCrypto, ECDH P-256 + AES-GCM, ECIES key wrapping).

Key facts that make it compatible:
  * ECDH on P-256: the WebCrypto `deriveKey(... AES-GCM 256)` uses the raw
    shared secret, which for P-256 is the 32-byte X coordinate. The `cryptography`
    library's `private.exchange(ec.ECDH(), peer_public)` returns exactly that
    32-byte X coordinate, so we use it directly as the AES-256-GCM key.
  * WebCrypto AES-GCM ciphertext has the 16-byte auth tag appended; `AESGCM`
    from `cryptography` uses the same layout, so base64 blobs interoperate.
  * JWK numbers (x, y, d) are base64url without padding.
"""

import base64
import json
import os

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

CURVE = ec.SECP256R1()


# ── base64url helpers ────────────────────────────────────────────────────────
def b64u_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def b64u_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def b64_decode(s: str) -> bytes:
    return base64.b64decode(s)


def b64_encode(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")


def _int_to_32(n: int) -> bytes:
    return n.to_bytes(32, "big")


# ── Key (de)serialization ────────────────────────────────────────────────────
def generate_private_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(CURVE)


def public_jwk(private_key: ec.EllipticCurvePrivateKey) -> dict:
    nums = private_key.public_key().public_numbers()
    return {
        "kty": "EC",
        "crv": "P-256",
        "x": b64u_encode(_int_to_32(nums.x)),
        "y": b64u_encode(_int_to_32(nums.y)),
    }


def private_jwk(private_key: ec.EllipticCurvePrivateKey) -> dict:
    nums = private_key.private_numbers()
    pub = nums.public_numbers
    return {
        "kty": "EC",
        "crv": "P-256",
        "x": b64u_encode(_int_to_32(pub.x)),
        "y": b64u_encode(_int_to_32(pub.y)),
        "d": b64u_encode(_int_to_32(nums.private_value)),
        "ext": True,
        "key_ops": ["deriveKey", "deriveBits"],
    }


def load_private_jwk(jwk: dict) -> ec.EllipticCurvePrivateKey:
    d = int.from_bytes(b64u_decode(jwk["d"]), "big")
    return ec.derive_private_key(d, CURVE)


def load_public_jwk(jwk: dict) -> ec.EllipticCurvePublicKey:
    x = int.from_bytes(b64u_decode(jwk["x"]), "big")
    y = int.from_bytes(b64u_decode(jwk["y"]), "big")
    return ec.EllipticCurvePublicNumbers(x, y, CURVE).public_key()


# ── Derived AES key (matches WebCrypto ECDH→AES-GCM-256) ──────────────────────
def derive_aes_key(private_key, peer_public_key) -> bytes:
    # Raw P-256 ECDH shared secret == 32-byte X coordinate == AES-256 key.
    return private_key.exchange(ec.ECDH(), peer_public_key)


# ── Message encryption (group key, raw 32-byte AES key) ───────────────────────
def encrypt_message(group_key: bytes, plaintext: str) -> dict:
    iv = os.urandom(12)
    ct = AESGCM(group_key).encrypt(iv, plaintext.encode("utf-8"), None)
    return {"ciphertext": b64_encode(ct), "iv": b64_encode(iv)}


def decrypt_message(group_key: bytes, ciphertext_b64: str, iv_b64: str) -> str:
    iv = b64_decode(iv_b64)
    ct = b64_decode(ciphertext_b64)
    return AESGCM(group_key).decrypt(iv, ct, None).decode("utf-8")


# ── ECIES group-key unwrap (matches unwrapGroupKeyNew) ────────────────────────
def unwrap_group_key(wrapped_info: dict, own_private_key) -> bytes:
    """wrapped_info = { wrappedKey, iv, ephemPub(JWK) } -> raw 32-byte group key."""
    ephem_pub = load_public_jwk(wrapped_info["ephemPub"])
    shared = derive_aes_key(own_private_key, ephem_pub)
    iv = b64_decode(wrapped_info["iv"])
    wrapped = b64_decode(wrapped_info["wrappedKey"])
    return AESGCM(shared).decrypt(iv, wrapped, None)


def wrap_group_key(group_key: bytes, recipient_public_key) -> dict:
    """Inverse of unwrap; rarely needed by the bridge but provided for symmetry."""
    ephem = generate_private_key()
    shared = derive_aes_key(ephem, recipient_public_key)
    iv = os.urandom(12)
    wrapped = AESGCM(shared).encrypt(iv, group_key, None)
    return {
        "wrappedKey": b64_encode(wrapped),
        "iv": b64_encode(iv),
        "ephemPub": public_jwk(ephem),
    }


# ── Persistent identity for the bridge ───────────────────────────────────────
def load_or_create_identity(path: str) -> ec.EllipticCurvePrivateKey:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return load_private_jwk(json.load(f))
    key = generate_private_key()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(private_jwk(key), f)
    return key
