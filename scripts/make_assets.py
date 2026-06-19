import base64, os

# A simple 1024x1024 solid navy PNG would be large to inline; instead generate
# small valid PNGs at the required-ish sizes. Expo accepts any size and scales.
# We build a solid-color PNG procedurally (no external deps).

import struct, zlib

def solid_png(path, size, rgb):
    w = h = size
    r, g, b = rgb
    raw = bytearray()
    row = bytes([r, g, b]) * w
    for _ in range(h):
        raw.append(0)  # filter type 0
        raw.extend(row)
    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ + data
        crc = zlib.crc32(typ + data) & 0xffffffff
        return c + struct.pack('>I', crc)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
assets = os.path.join(base, 'assets')
os.makedirs(assets, exist_ok=True)
navy = (14, 26, 43)
solid_png(os.path.join(assets, 'icon.png'), 1024, navy)
solid_png(os.path.join(assets, 'adaptive-icon.png'), 1024, navy)
solid_png(os.path.join(assets, 'splash.png'), 1242, navy)
solid_png(os.path.join(assets, 'favicon.png'), 48, navy)
print('assets written to', assets)
