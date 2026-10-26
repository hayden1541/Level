"""Minimal zipalign: rewrite an APK so every STORED entry's data starts on a
4-byte boundary (resources.arsc must be uncompressed and aligned for targetSdk 30+).
Padding goes into an 0xD935 extra field, the same way Google's zipalign does it."""
import struct, sys, zipfile

src, dst = sys.argv[1], sys.argv[2]
ALIGN = 4
NO_COMPRESS = ('.png', '.arsc', '.jpg', '.webp', '.ogg', '.mp3')

with zipfile.ZipFile(src) as zin, open(dst, 'wb') as raw:
    zout = zipfile.ZipFile(raw, 'w')
    for info in zin.infolist():
        data = zin.read(info.filename)
        ni = zipfile.ZipInfo(info.filename, date_time=(2026, 1, 1, 0, 0, 0))
        ni.external_attr = info.external_attr
        stored = info.filename.endswith(NO_COMPRESS) or info.compress_type == zipfile.ZIP_STORED
        ni.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
        ni.extra = b''
        if stored:
            name_len = len(info.filename.encode('utf-8'))
            base = raw.tell() + 30 + name_len
            k = 0
            while (base + 6 + k) % ALIGN:
                k += 1
            ni.extra = struct.pack('<HHH', 0xD935, 2 + k, ALIGN) + b'\0' * k
        zout.writestr(ni, data)
    zout.close()

# verify alignment
with zipfile.ZipFile(dst) as z, open(dst, 'rb') as f:
    for info in z.infolist():
        if info.compress_type == zipfile.ZIP_STORED:
            f.seek(info.header_offset)
            h = f.read(30)
            n, e = struct.unpack('<HH', h[26:30])
            off = info.header_offset + 30 + n + e
            assert off % ALIGN == 0, (info.filename, off)
print('aligned', dst)
