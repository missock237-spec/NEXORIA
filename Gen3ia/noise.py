"""Gen3ia.noise — bruit procédural vectorisé (Perlin, fBm, ridged, domain warp).

100 % déterministe : le hachage grille est un splitmix64 sur uint64 (numpy).
Aucune dépendance à l'état global : la seed est passée en argument.
"""
from __future__ import annotations
import numpy as np

_U = np.uint64
C1 = _U(0x9E3779B97F4A7C15)   # golden ratio
C2 = _U(0xC2B2AE3D27D4EB4F)
C3 = _U(0xFF51AFD7ED558CCD)
C4 = _U(0xC4CEB9FE1A85EC53)
TAU = np.float64(2.0 * np.pi)


def _hash2(ix: np.ndarray, iy: np.ndarray, seed: int) -> np.ndarray:
    """splitmix64(x, y, seed) -> uint64. Coord. négatives : compl. à 2 (déterministe)."""
    h = (ix.astype(np.uint64) * C1) ^ (iy.astype(np.uint64) * C2) ^ _U(seed & 0xFFFFFFFFFFFFFFFF)
    h ^= h >> _U(33); h *= C3
    h ^= h >> _U(33); h *= C4
    h ^= h >> _U(33)
    return h


def _rand01(ix, iy, seed) -> np.ndarray:
    return (_hash2(ix, iy, seed) >> _U(11)).astype(np.float64) / np.float64(1 << 53)


def _fade(t: np.ndarray) -> np.ndarray:
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def perlin(x: np.ndarray, y: np.ndarray, seed: int) -> np.ndarray:
    """Bruit de Perlin 2D vectorisé, sortie ~[-1, 1]."""
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    xf = x - xi
    yf = y - yi

    def grad(ix, iy, dx, dy):
        ang = (_hash2(ix, iy, seed) >> _U(40)).astype(np.float64) / np.float64(1 << 24) * TAU
        return np.cos(ang) * dx + np.sin(ang) * dy

    u, v = _fade(xf), _fade(yf)
    n00 = grad(xi, yi, xf, yf)
    n10 = grad(xi + 1, yi, xf - 1.0, yf)
    n01 = grad(xi, yi + 1, xf, yf - 1.0)
    n11 = grad(xi + 1, yi + 1, xf - 1.0, yf - 1.0)
    nx0 = n00 + u * (n10 - n00)
    nx1 = n01 + u * (n11 - n01)
    return nx0 + v * (nx1 - nx0)


def fbm(x, y, seed: int, octaves: int = 6, lacunarity: float = 2.0,
        gain: float = 0.5, ridged: bool = False) -> np.ndarray:
    """Bruits fractals fBm (ou ridged pour des crêtes montagneuses), ~[-1, 1]."""
    total = np.zeros(np.broadcast(x, y).shape, dtype=np.float64)
    amp, freq, norm = 1.0, 1.0, 0.0
    for o in range(octaves):
        n = perlin(x * freq + o * 17.13, y * freq - o * 31.77, seed + o * 1013)
        if ridged:
            n = 1.0 - 2.0 * np.abs(n)          # crêtes
            n = n * n
        total += n * amp
        norm += amp
        amp *= gain
        freq *= lacunarity
    return total / max(norm, 1e-9)


def domain_warp(x, y, seed: int, strength: float, res: int = 4):
    """Déformation de domaine (côtes organiques). Retourne (x2, y2)."""
    wx = fbm(x + 5.2, y + 1.3, seed + 7771, octaves=res)
    wy = fbm(x - 3.7, y + 9.1, seed + 7772, octaves=res)
    return x + wx * strength, y + wy * strength


def smoothstep(e0: float, e1: float, v: np.ndarray) -> np.ndarray:
    t = np.clip((v - e0) / max(e1 - e0, 1e-9), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def bilinear_sample(img: np.ndarray, px: np.ndarray, py: np.ndarray) -> np.ndarray:
    """Échantillonnage bilinéaire de `img` (rangée 0 = nord) aux pixels (px, py)."""
    h, w = img.shape
    px = np.clip(px, 0.0, w - 1.001)
    py = np.clip(py, 0.0, h - 1.001)
    x0 = px.astype(np.int64); y0 = py.astype(np.int64)
    fx = (px - x0)[:, None] if px.ndim == 1 else px - x0
    fy = (py - y0)[:, None] if py.ndim == 1 else py - y0
    x1 = np.minimum(x0 + 1, w - 1); y1 = np.minimum(y0 + 1, h - 1)
    a = img[y0, x0]; b = img[y0, x1]; c = img[y1, x0]; d = img[y1, x1]
    if fx.ndim == 2:
        return (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy)
    return (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy).ravel()


def map_coords(res: int, dtype=np.float64):
    """Grilles de pixels + coordonnées monde pour une carte `res`×`res`."""
    ys, xs = np.mgrid[0:res, 0:res].astype(dtype)
    px = xs + 0.5
    py = ys + 0.5
    wx = px / res * 65536.0 - 32768.0
    wz = (1.0 - py / res) * 65536.0 - 32768.0
    return px, py, wx, wz
