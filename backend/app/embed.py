"""Simple MVP dense-vector embeddings. Dependency-free.

Each token gets a deterministic pseudo-random unit vector (seeded from its
SHA-256 hash). A document embeds as the IDF-weighted average of its token
vectors, L2-normalized. Similarity is cosine (dot product of unit vectors).

This is a real dense-vector retrieval setup (embed -> cosine -> top-k),
just with fixed random token vectors instead of learned ones — no network,
no model download, fully offline. Swap `token_vector` for a learned table
(e.g. word2vec/GloVe or an API embedding) later without changing callers.
"""
import hashlib
import math
import random
from collections import Counter

DIM = 256

_token_cache: dict = {}


def token_vector(tok: str) -> list:
    """Deterministic unit vector for one token."""
    v = _token_cache.get(tok)
    if v is None:
        seed = int.from_bytes(hashlib.sha256(tok.encode()).digest()[:8], "little")
        rnd = random.Random(seed)
        raw = [rnd.gauss(0.0, 1.0) for _ in range(DIM)]
        n = math.sqrt(sum(x * x for x in raw)) or 1.0
        v = [x / n for x in raw]
        _token_cache[tok] = v
    return v


def embed_counter(counter: Counter, idf: dict | None = None) -> list:
    """IDF-weighted mean of token vectors, L2-normalized. Empty -> zero vector."""
    if not counter:
        return [0.0] * DIM
    acc = [0.0] * DIM
    for tok, w in counter.items():
        idf_w = (idf or {}).get(tok, 1.0)
        tw = float(w) * idf_w
        if tw == 0:
            continue
        tv = token_vector(tok)
        for i in range(DIM):
            acc[i] += tv[i] * tw
    n = math.sqrt(sum(x * x for x in acc))
    if n == 0:
        return [0.0] * DIM
    return [x / n for x in acc]


def cosine_sim(a: list, b: list) -> float:
    """Cosine similarity. Inputs are expected unit-normed; safe on zero vectors."""
    if not a or not b:
        return 0.0
    return sum(x * y for x, y in zip(a, b))
