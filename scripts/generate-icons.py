#!/usr/bin/env python3
"""Vygeneruje PWA ikony z loga (src/assets/logo.png).

Použití:  python3 scripts/generate-icons.py   (potřebuje Pillow: pip install pillow)
Výstup:   public/icons/*.png, public/icons/icon.svg, public/favicon.png
Logo je světlé na průhledném pozadí, proto ho klademe na tmavé pozadí aplikace.
"""
import base64, io, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, 'src', 'assets', 'logo.png')
OUT = os.path.join(ROOT, 'public', 'icons')
BG = (28, 25, 23, 255)  # #1c1917 (stone-900), stejná barva jako theme_color
SS = 4                  # supersampling pro hladké rohy

os.makedirs(OUT, exist_ok=True)
logo = Image.open(LOGO).convert('RGBA')


def render(size, logo_width, rounded):
    """Čtvercová ikona; logo_width je podíl šířky ikony, který logo zabere."""
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * 0.225), fill=BG)
    else:
        d.rectangle((0, 0, big, big), fill=BG)
    w = int(big * logo_width)
    h = int(w * logo.height / logo.width)
    mark = logo.resize((w, h), Image.LANCZOS)
    img.alpha_composite(mark, ((big - w) // 2, (big - h) // 2))
    return img.resize((size, size), Image.LANCZOS)


def save(img, name, flatten=False):
    if flatten:  # apple-touch-icon nesmí mít průhlednost
        flat = Image.new('RGB', img.size, BG[:3])
        flat.paste(img, mask=img.split()[3])
        img = flat
    img.save(os.path.join(OUT, name), optimize=True)
    print('vytvořeno', name, img.size)


# "any": zaoblený čtverec, logo ~78 % šířky
save(render(192, 0.78, True), 'icon-192.png')
save(render(512, 0.78, True), 'icon-512.png')
# "maskable": plný čtverec, logo uvnitř bezpečné zóny (kruh ~80 %)
save(render(192, 0.66, False), 'icon-maskable-192.png')
save(render(512, 0.66, False), 'icon-maskable-512.png')
# iOS: plný čtverec bez průhlednosti (systém zaoblí rohy sám)
save(render(180, 0.78, False), 'apple-touch-icon.png', flatten=True)
# favicon
render(64, 0.84, True).save(os.path.join(ROOT, 'public', 'favicon.png'), optimize=True)
print('vytvořeno favicon.png')

# SVG verze (logo vložené jako PNG data URI)
small = logo.resize((600, int(600 * logo.height / logo.width)), Image.LANCZOS)
buf = io.BytesIO(); small.save(buf, 'PNG', optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
lw = 512 * 0.78; lh = lw * logo.height / logo.width
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="115" fill="#1c1917"/>
  <image href="data:image/png;base64,{b64}" x="{(512 - lw) / 2:.1f}" y="{(512 - lh) / 2:.1f}" width="{lw:.1f}" height="{lh:.1f}"/>
</svg>
'''
open(os.path.join(OUT, 'icon.svg'), 'w').write(svg)
print('vytvořeno icon.svg')
