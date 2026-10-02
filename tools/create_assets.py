from pathlib import Path
from PIL import Image, ImageOps
import json, math, wave, struct, shutil
ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'tools' / 'art-inputs.json'
expressions = ['neutral','smile','thinking','surprise','riichi','win','loss','special']
for char in json.loads(CONFIG.read_text(encoding='utf-8')):
    dst = ROOT / 'assets' / 'characters' / char['id']
    dst.mkdir(parents=True, exist_ok=True)
    sources = {key: ROOT / char[key] for key in ['base','sheet','cutin']}
    base = Image.open(sources['base']).convert('RGBA')
    box = base.getchannel('A').getbbox()
    base.crop(box).save(dst / 'base.webp', quality=90)
    if sources['base'].resolve() != (dst / 'base-original.png').resolve(): shutil.copy2(sources['base'], dst / 'base-original.png')
    sheet = Image.open(sources['sheet']).convert('RGBA')
    if sources['sheet'].resolve() != (dst / 'expressions-original.png').resolve(): shutil.copy2(sources['sheet'], dst / 'expressions-original.png')
    w,h = sheet.size
    for k,name in enumerate(expressions):
        x,y = k%4*w//4,k//4*h//2
        panel = sheet.crop((x+4,y+4,x+w//4-4,y+h//2-12))
        panel.save(dst / (name+'.webp'), quality=92)
    cutin=Image.open(sources['cutin']).convert('RGBA')
    cutin.crop(cutin.getchannel('A').getbbox()).save(dst / 'cutin.webp', quality=92)
    if sources['cutin'].resolve() != (dst / 'cutin-original.png').resolve(): shutil.copy2(sources['cutin'], dst / 'cutin-original.png')
audio = ROOT / 'assets' / 'audio'
audio.mkdir(parents=True, exist_ok=True)
notes = {'tile':[920,350], 'select':[560], 'riichi':[523,784,1047], 'call':[440,659], 'win':[392,494,587,784,988], 'draw':[330,262], 'rank':[659,784]}
rate=24000
for kind, freqs in notes.items():
    length=.09*len(freqs)+.25
    samples=[]
    for n in range(int(rate*length)):
        t=n/rate
        value=0
        for k,f in enumerate(freqs):
            u=t-k*.09
            if 0<=u<.28:
                envelope=min(1,u/.008)*math.exp(-u*17)
                value+=math.sin(2*math.pi*f*u)*envelope*.22
        samples.append(struct.pack('<h', int(max(-1,min(1,value))*32767)))
    with wave.open(str(audio/(kind+'.wav')),'wb') as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(b''.join(samples))
print('4 base images, 28 expressions, 4 cut-ins, 4 special poses, 7 WAV sound effects packed.')
