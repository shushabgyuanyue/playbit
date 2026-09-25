"""Extract reusable transparent mascots from the user-provided homepage artwork."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ASSETS = Path(__file__).resolve().parents[1] / 'apps/web/src/assets'
source = Image.open(ASSETS / 'home-hero.webp').convert('RGBA')


def extract(points, bounds):
    mask = Image.new('L', source.size)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    cutout = source.copy()
    cutout.putalpha(mask.filter(ImageFilter.GaussianBlur(1)))
    return cutout.crop(bounds)


panda = extract([
    (996, 827), (1002, 812), (1015, 808), (1024, 778), (1028, 758),
    (1018, 741), (1011, 711), (1009, 683), (1016, 665), (1030, 651),
    (1049, 652), (1059, 645), (1075, 641), (1081, 631), (1092, 629),
    (1105, 642), (1120, 650), (1134, 666), (1145, 686), (1157, 703),
    (1157, 721), (1167, 725), (1175, 716), (1186, 716), (1195, 725),
    (1194, 741), (1186, 754), (1162, 774), (1154, 791), (1167, 804),
    (1176, 822), (1180, 842), (1129, 842), (1080, 837), (1040, 836),
], (990, 624, 1201, 848))
panda.save(ASSETS / 'brand-panda.webp', quality=95)

rabbit = extract([
    (1220, 766), (1208, 749), (1202, 731), (1205, 709), (1216, 688),
    (1231, 674), (1255, 666), (1270, 641), (1277, 621), (1293, 602),
    (1310, 590), (1326, 589), (1336, 600), (1335, 613), (1328, 635),
    (1315, 658), (1338, 638), (1359, 625), (1379, 620), (1397, 625),
    (1406, 636), (1402, 648), (1389, 666), (1368, 682), (1344, 696),
    (1343, 719), (1335, 743), (1314, 761), (1284, 773), (1250, 776),
], (1196, 583, 1412, 782))
rabbit.save(ASSETS / 'brand-rabbit.webp', quality=95)
# Retain the original face and fur detail while removing the warm artwork tint.
luminance = ImageOps.grayscale(rabbit).point(lambda value: round(255 * (value / 255) ** 0.65))
white_rabbit = ImageOps.colorize(luminance, '#56667e', '#ffffff').convert('RGBA')
white_rabbit.putalpha(rabbit.getchannel('A'))
# The small account mark needs a fuller face and shorter ears than the illustration.
ear_height = 84
icon_width = 228
ears = white_rabbit.crop((0, 0, rabbit.width, ear_height)).resize(
    (icon_width, 66), Image.Resampling.LANCZOS)
face = white_rabbit.crop((0, ear_height, rabbit.width, rabbit.height)).resize(
    (icon_width, 139), Image.Resampling.LANCZOS)
account_mark = Image.new('RGBA', (icon_width, ears.height + face.height))
account_mark.paste(ears, (0, 0))
account_mark.paste(face, (0, ears.height))
account_mark.save(ASSETS / 'brand-rabbit-white.webp', quality=95)
