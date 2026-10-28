"""Build original game stimuli. Requires Pillow and imageio-ffmpeg; no API keys."""
import json
import math
import struct
import subprocess
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "apps/player/public/media/cards"
OUT.mkdir(parents=True, exist_ok=True)
INK, PAPER, CORAL, VIOLET, LIME = "#18151d", "#f6f3ee", "#ff654d", "#7d54ff", "#c9f45d"
FONT = Path("C:/Windows/Fonts/msyh.ttc")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def font(size):
    return ImageFont.truetype(str(FONT), size) if FONT.exists() else ImageFont.load_default()


def canvas(color=PAPER, size=(640, 480)):
    image = Image.new("RGB", size, color)
    return image, ImageDraw.Draw(image)


def save(image, name):
    image.save(OUT / name, "WEBP", quality=86, method=6)


def sticker(draw, kind, x, y):
    draw.rounded_rectangle((x-43, y-40, x+43, y+40), 16, fill="white")
    if kind == "strawberry":
        draw.polygon([(x-24,y-12),(x+24,y-12),(x+18,y+11),(x,y+31),(x-18,y+11)], fill=CORAL)
        for dx, dy in [(-10,0),(10,0),(0,13)]:
            draw.ellipse((x+dx-2,y+dy-2,x+dx+2,y+dy+2), fill="#fff1c4")
        draw.polygon([(x-26,y-15),(x-5,y-17),(x,y-30),(x+7,y-17),(x+25,y-15),(x,y-8)], fill="#5a8a4a")
    elif kind == "coffee":
        draw.ellipse((x+11,y-14,x+36,y+11), outline=INK, width=5)
        draw.rounded_rectangle((x-24,y-20,x+20,y+23), 8, fill="#e2d8ff", outline=INK, width=3)
        draw.ellipse((x-21,y-18,x+17,y-7), fill="#725039")
    elif kind == "flower":
        for angle in range(0, 360, 72):
            dx, dy = 19*math.cos(math.radians(angle)), 19*math.sin(math.radians(angle))
            draw.ellipse((x+dx-14,y+dy-14,x+dx+14,y+dy+14), fill="#ed9eba")
        draw.ellipse((x-12,y-12,x+12,y+12), fill="#f4cc48")
    elif kind == "lemon":
        draw.ellipse((x-30,y-19,x+30,y+19), fill="#f3d152", outline=INK, width=2)
        draw.arc((x-22,y-12,x+23,y+12), 190, 310, fill="#fff5b3", width=4)
    elif kind == "egg":
        draw.ellipse((x-23,y-31,x+23,y+31), fill="#fff9e5", outline=INK, width=2)
        draw.ellipse((x-12,y-5,x+12,y+19), fill="#efbb46")
    else:
        draw.polygon([(x-27,y-9),(x-26,y-33),(x-6,y-19),(x+9,y-19),(x+27,y-33),(x+27,y-4)], fill="#e6a85d")
        draw.ellipse((x-29,y-23,x+29,y+29), fill="#e6a85d")
        draw.line((x-18,y-1,x-7,y-1), fill=INK, width=3)
        draw.line((x+7,y-1,x+18,y-1), fill=INK, width=3)
        draw.polygon([(x-4,y+8),(x+4,y+8),(x,y+13)], fill=INK)


def pictures():
    image, draw = canvas("#e0ebe5")
    draw.rounded_rectangle((28,18,612,463), 28, fill="#f0f4ed", outline="#b6c4ba", width=4)
    draw.rounded_rectangle((575,160,588,300), 6, fill="#a6b9ad")
    kinds = ["strawberry","coffee","flower","lemon","cat","strawberry","flower","egg","coffee","lemon","strawberry","flower"]
    for i, kind in enumerate(kinds):
        sticker(draw, kind, 105+(i%4)*137, 91+(i//4)*145)
    save(image, "fridge-notes.webp")

    image, draw = canvas("#dcebe7")
    draw.rounded_rectangle((208,100,443,390), 50, fill="#c5d3d7")
    draw.polygon([(213,159),(225,60),(286,117),(359,117),(417,61),(431,166)], fill="#e9a45d", outline=INK)
    draw.ellipse((205,98,438,310), fill="#e9a45d", outline=INK, width=4)
    draw.line((244,186,284,191), fill=INK, width=6)
    draw.line((358,191,398,186), fill=INK, width=6)
    draw.polygon([(311,214),(333,214),(322,227)], fill="#a35e45")
    draw.line((303,248,341,248), fill=INK, width=4)
    draw.rectangle((0,319,640,480), fill="#e1c7b2")
    draw.line((0,320,640,320), fill=INK, width=4)
    draw.rounded_rectangle((230,296,287,340), 20, fill="#e9a45d", outline=INK, width=3)
    draw.rounded_rectangle((363,296,421,340), 20, fill="#e9a45d", outline=INK, width=3)
    draw.ellipse((96,330,190,357), fill="#f6f3ee", outline=INK, width=3)
    draw.rounded_rectangle((106,261,174,340), 8, fill="white", outline=INK, width=3)
    draw.ellipse((112,266,167,280), fill="#735243")
    for n in range(3):
        draw.rounded_rectangle((468+n*4,290-n*15,590+n*4,325-n*15), 4, fill=PAPER, outline=INK, width=2)
    save(image, "monday-cat.webp")

    image, draw = canvas("#f4e7df")
    for i, (label, color) in enumerate([("冰美式", "#6e4e42"),("冰拿铁", "#d3b18c"),("橙气泡", "#edb44d")]):
        x = 111+i*210
        draw.rounded_rectangle((x-58,115,x+58,315), 16, fill="#fffaf1", outline=INK, width=3)
        draw.rounded_rectangle((x-49,157,x+49,305), 11, fill=color)
        for dx, dy in [(-21,188),(18,220),(-18,257)]:
            draw.rounded_rectangle((x+dx-13,dy-13,x+dx+13,dy+13), 4, fill="#eee4d2")
        draw.line((x+21,85,x+5,195), fill=CORAL, width=7)
        draw.text((x,350), label, font=font(26), fill=INK, anchor="mm")
    save(image, "coffee-menu.webp")

    image, draw = canvas("#ece7f4")
    for i, color in enumerate(["#264f49", "#e9a84e", "#9b7ed3"]):
        x = 35+i*205
        draw.rounded_rectangle((x,66,x+175,365), 7, fill=color)
        draw.line((x+10,74,x+10,356), fill="#ffffff", width=2)
        if i == 0:
            draw.ellipse((x+47,154,x+130,237), fill="#f6e7aa")
            draw.ellipse((x+75,138,x+144,212), fill=color)
        elif i == 1:
            draw.ellipse((x+41,149,x+136,244), fill=CORAL)
            draw.polygon([(x+91,151),(x+96,120),(x+117,129)], fill="#396a4d")
        else:
            draw.pieslice((x+36,145,x+143,243), 180, 360, fill="#f0d8a6")
            draw.line((x+89,195,x+89,264), fill=INK, width=5)
            draw.arc((x+70,246,x+91,270), 0, 180, fill=INK, width=5)
        draw.text((x+87,404), str(i+1), font=font(22), fill=INK, anchor="mm")
    save(image, "book-window.webp")


def cup_positions(t):
    base = [80.0, 240.0, 400.0]
    slots = [0, 1, 2]
    positions = base.copy()
    for start, a, b in [(1.6,0,1),(2.85,1,2),(4.1,0,2),(5.35,0,1)]:
        if t >= start+.9:
            slots[a], slots[b] = slots[b], slots[a]
            for slot, cup_id in enumerate(slots):
                positions[cup_id] = base[slot]
        elif t >= start:
            fraction = (t-start)/.9
            ease = fraction*fraction*(3-2*fraction)
            positions[slots[a]] = base[a]+(base[b]-base[a])*ease
            positions[slots[b]] = base[b]+(base[a]-base[b])*ease
            break
    return positions


def cup_frame(t):
    image, draw = canvas(size=(480,400))
    positions = cup_positions(t)
    draw.line((22,290,458,290), fill="#d2cbc2", width=2)
    if t < 1.5:
        draw.ellipse((66,255,94,283), fill="#efbd43", outline=INK, width=2)
    for cup_id, x in enumerate(positions):
        lift = max(0.0, min(1.0, (1.45-t)/.45))*100 if cup_id == 0 and t < 1.45 else 0
        y = 177-lift
        draw.polygon([(x-28,y),(x+28,y),(x+44,y+108),(x-44,y+108)], fill=VIOLET, outline=INK, width=3)
        draw.ellipse((x-28,y-7,x+28,y+7), fill="#b9a1fb", outline=INK, width=2)
        draw.line((x-15,y+19,x-24,y+85), fill="#b9a1fb", width=4)
    for i, x in enumerate([80,240,400]):
        draw.text((x,326), str(i+1), font=font(24), fill=INK, anchor="mm")
    return image


def video():
    assert [cup_positions(t)[0] for t in [0,2.6,3.9,5.1,7.9]] == [80,240,400,80,240]
    save(cup_frame(0), "cup-shuffle.webp")
    args = [FFMPEG,"-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s","480x400","-r","24","-i","-","-an","-c:v","libx264","-crf","25","-preset","fast","-movflags","+faststart","-pix_fmt","yuv420p",str(OUT/"cup-shuffle.mp4")]
    process = subprocess.Popen(args, stdin=subprocess.PIPE)
    for i in range(8*24):
        process.stdin.write(cup_frame(i/24).tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("Video encoding failed")


def audio(name, duration, events):
    rate = 22050
    samples = [0.0]*int(rate*duration)
    for at, hz, length, knock in events:
        for i in range(int(rate*length)):
            t = i/rate
            envelope = math.exp(-t*(38 if knock else 7))*min(1,t/.006)
            value = math.sin(2*math.pi*hz*t)+.25*math.sin(2*math.pi*hz*2.01*t)
            index = int(at*rate)+i
            if index < len(samples):
                samples[index] += .45*value*envelope
    with tempfile.TemporaryDirectory(prefix="playbit-sounds-") as tmp:
        source = Path(tmp)/"source.wav"
        with wave.open(str(source), "wb") as output:
            output.setparams((1,2,rate,0,"NONE","not compressed"))
            output.writeframes(b"".join(struct.pack("<h",int(max(-1,min(1,x))*30000)) for x in samples))
        subprocess.run([FFMPEG,"-y","-loglevel","error","-i",str(source),"-c:a","aac","-b:a","48k","-movflags","+faststart",str(OUT/name)],check=True)


if __name__ == "__main__":
    pictures()
    video()
    audio("knock-pattern.m4a",6,[(at,180,.18,True) for at in [.5,1.7,1.9,3.0,4.2,4.4,4.6]])
    notes = [261.63,329.63,392,440,392,329.63,293.66,261.63,329.63,392,440,523.25,440,392,329.63,261.63]
    audio("little-theme.m4a",8,[(i*.5,hz,.46,False) for i,hz in enumerate(notes)])
    manifest = {"creator":"Playbit", "source":"Original procedural game illustrations, animation and synthesized audio", "generator":"scripts/build-scene-card-media.py", "assets":[{"file":p.name,"bytes":p.stat().st_size} for p in sorted(OUT.iterdir()) if p.suffix in [".webp",".mp4",".m4a"]]}
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(manifest,ensure_ascii=False))
