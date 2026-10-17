"""Procedurally generate the PWA / home-screen icons.

Only the Python standard library is used: the artwork is rasterised from a
16x16 pixel pattern plus a rounded, gradient lit background, then encoded as
a real PNG (IHDR/IDAT/IEND with zlib + CRC32).
"""
import math
import os
import struct
import sys
import zlib

BG_TOP = (28, 20, 52)
BG_BOTTOM = (11, 10, 18)
OUTSIDE = (8, 7, 13)
FRAME = (59, 51, 88)
GLOW = (123, 92, 255)

PALETTE = {
    'W': (255, 210, 87),
    'Y': (255, 246, 207),
    'G': (201, 139, 46),
    'H': (107, 68, 19),
}

# 16x16 sword: W blade, Y highlight, G crossguard, H grip, '.' transparent
SWORD = [
    "................",
    ".......W........",
    "......WWWW......",
    "......WYYW......",
    "......WYYW......",
    "......WYYW......",
    "......WYYW......",
    "......WYYW......",
    "......WYYW......",
    ".GGGGGGGGGGGGGG.",
    "......WYYW......",
    ".......HH.......",
    ".......HH.......",
    ".......HH.......",
    ".......HH.......",
    "......GGGG......",
]


def sd_round_box(px, py, hw, hh, r):
    qx = abs(px) - (hw - r)
    qy = abs(py) - (hh - r)
    return math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - r


def coverage(x, y, size, samples=2):
    """Anti-aliased coverage of the rounded square for one pixel."""
    hit = 0
    step = 1.0 / samples
    for sy in range(samples):
        for sx in range(samples):
            u = (x + (sx + 0.5) * step) / size - 0.5
            v = (y + (sy + 0.5) * step) / size - 0.5
            if sd_round_box(u, v, 0.47, 0.47, 0.17) <= 0.0:
                hit += 1
    return hit / (samples * samples)


def render(size):
    px = bytearray(size * size * 3)
    for y in range(size):
        t = y / max(1, size - 1)
        for x in range(size):
            u = x / size - 0.5
            v = y / size - 0.5
            d = sd_round_box(u, v, 0.47, 0.47, 0.17)
            idx = (y * size + x) * 3
            if d > 0.02:
                r, g, b = OUTSIDE
            else:
                cov = 1.0 if d < -0.02 else coverage(x, y, size)
                r = BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t
                g = BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t
                b = BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t
                # purple glow behind the sword
                dist = math.hypot(u, v + 0.02)
                glow = max(0.0, 1.0 - dist / 0.46) ** 2 * 0.55
                r = r * (1 - glow) + GLOW[0] * glow
                g = g * (1 - glow) + GLOW[1] * glow
                b = b * (1 - glow) + GLOW[2] * glow
                if d > -0.014:
                    r, g, b = FRAME
                if cov < 1.0:
                    r = r * cov + OUTSIDE[0] * (1 - cov)
                    g = g * cov + OUTSIDE[1] * (1 - cov)
                    b = b * cov + OUTSIDE[2] * (1 - cov)
            px[idx] = int(r)
            px[idx + 1] = int(g)
            px[idx + 2] = int(b)

    # pixel-art sword overlay, nearest neighbour for a crisp pixel look
    scale = max(1, round(size * 0.72 / 16))
    art = 16 * scale
    ox = (size - art) // 2
    oy = (size - art) // 2
    for gy, row in enumerate(SWORD):
        for gx, ch in enumerate(row):
            col = PALETTE.get(ch)
            if not col:
                continue
            for yy in range(scale):
                Y = oy + gy * scale + yy
                if not (0 <= Y < size):
                    continue
                for xx in range(scale):
                    X = ox + gx * scale + xx
                    if not (0 <= X < size):
                        continue
                    i = (Y * size + X) * 3
                    px[i] = col[0]
                    px[i + 1] = col[1]
                    px[i + 2] = col[2]
    return px


def write_png(path, size):
    pixels = render(size)
    raw = b''.join(b'\x00' + bytes(pixels[y * size * 3:(y + 1) * size * 3]) for y in range(size))

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    return len(png)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    for size in (512, 192, 180, 32):
        name = 'icon-%d.png' % size
        n = write_png(os.path.join(out, name), size)
        print('%-14s %4dx%-4d %7d bytes' % (name, size, size, n))


if __name__ == '__main__':
    main()
