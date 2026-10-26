from PIL import Image
import os, sys
root = sys.argv[1]
# 16x16 pixel icon: gold up-arrow over an open book
G='#f2c14e'; g='#b8862a'; C='#efe7d2'; c='#b9b0d6'; B='#17152a'; L='#4b4680'; T=None
art = [
"................",
".......GG.......",
"......GGGG......",
".....GGGGGG.....",
"....GGGGGGGG....",
"...gggGGGGggg...",
"......GGGG......",
"......GGGG......",
"......gggg......",
"................",
"..CCCCC..CCCCC..",
".CcccCCLLCCcccC.",
".CCCCCCLLCCCCCC.",
".CcccCCLLCCcccC.",
".CCCCCCLLCCCCCC.",
"..LLLLLLLLLLLL..",
]
cmap={'G':G,'g':g,'C':C,'c':c,'L':L,'.':None}
def render(size, bg=True, mono=False):
    pad=2
    n=16+pad*2
    im=Image.new('RGBA',(n,n),(0,0,0,0))
    px=im.load()
    for y in range(n):
        for x in range(n):
            if bg:
                # rounded-square background (pixel corners)
                corner = (x<1 or x>n-2) and (y<1 or y>n-2)
                if not corner: px[x,y]=tuple(int(B[i:i+2],16) for i in (1,3,5))+(255,)
    for y,row in enumerate(art):
        for x,ch in enumerate(row):
            col=cmap[ch]
            if col:
                if mono: px[x+pad,y+pad]=(255,255,255,255)
                else: px[x+pad,y+pad]=tuple(int(col[i:i+2],16) for i in (1,3,5))+(255,)
    return im.resize((size,size),Image.NEAREST)
for d,s in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    os.makedirs(f'{root}/res/mipmap-{d}',exist_ok=True)
    render(s).save(f'{root}/res/mipmap-{d}/ic_launcher.png')
os.makedirs(f'{root}/res/drawable-xxhdpi',exist_ok=True)
render(72,bg=False,mono=True).save(f'{root}/res/drawable-xxhdpi/ic_stat.png')
render(512).save(f'{root}/../icon-512.png')
