"""Bazaar Khabar ka apna launcher icon banata hai (Capacitor ke default icon ki jagah).
Chalane ka tareeka:  python3 make_icons.py [res_folder]   (default: android/app/src/main/res)"""
import os, sys
from PIL import Image, ImageDraw

RES = sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/res'
BG = (20, 26, 69)
S = 432 * 2  # 2x banake chhota karenge (smooth kinare)

def art():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    u = S / 108.0                       # 1dp
    x0, base = 30 * u, 74 * u           # safe zone: andar ke 66dp
    cols = [(46, 211, 241), (255, 200, 61), (74, 222, 128)]
    hts = [16, 26, 38]
    for i, (c, h) in enumerate(zip(cols, hts)):
        l = x0 + i * 15 * u
        d.rounded_rectangle([l, base - h * u, l + 11 * u, base], radius=3 * u, fill=c)
    # upar jaata teer
    p = [(31 * u, 52 * u), (47 * u, 41 * u), (58 * u, 47 * u), (76 * u, 30 * u)]
    d.line(p, fill=(255, 255, 255), width=int(3.2 * u), joint='curve')
    d.polygon([(80 * u, 26 * u), (68 * u, 29 * u), (77 * u, 38 * u)], fill=(255, 255, 255))
    return im

def save(im, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.resize((size, size), Image.LANCZOS).save(path)

fg = art()
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
full = Image.new('RGBA', (S, S), BG + (255,)); full.alpha_composite(fg)
c = int(S * 18 / 108)                    # legacy icon ke liye kinare kaato
legacy = full.crop((c, c, S - c, S - c))
n = legacy.width
sq = Image.new('L', (n, n), 0); ImageDraw.Draw(sq).rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * .22), fill=255)
ci = Image.new('L', (n, n), 0); ImageDraw.Draw(ci).ellipse([0, 0, n - 1, n - 1], fill=255)
for k, m in dens.items():
    f = f'{RES}/mipmap-{k}'
    save(fg, f'{f}/ic_launcher_foreground.png', int(108 * m))
    a = legacy.copy(); a.putalpha(sq); save(a, f'{f}/ic_launcher.png', int(48 * m))
    b = legacy.copy(); b.putalpha(ci); save(b, f'{f}/ic_launcher_round.png', int(48 * m))

os.makedirs(f'{RES}/drawable', exist_ok=True)
open(f'{RES}/drawable/ic_launcher_background.xml', 'w').write(
 '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n<solid android:color="#141A45"/>\n</shape>\n')
os.makedirs(f'{RES}/mipmap-anydpi-v26', exist_ok=True)
for nm in ('ic_launcher', 'ic_launcher_round'):
    open(f'{RES}/mipmap-anydpi-v26/{nm}.xml', 'w').write(
     '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n<background android:drawable="@drawable/ic_launcher_background"/>\n<foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
# Capacitor ka purana vector foreground hata do, warna purana icon dikhega
for p in (f'{RES}/drawable-v24/ic_launcher_foreground.xml', f'{RES}/drawable/ic_launcher_foreground.xml'):
    if os.path.exists(p): os.remove(p)
print('icons ready ->', RES)
