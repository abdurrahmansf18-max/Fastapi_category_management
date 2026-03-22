import re

f = r'C:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\i18n.ts'
d = open(f, encoding='utf-8').read()
en_adds = '''
    "tip_2_1": "To add an image use ",
    "tip_2_2": " expression",
    "image": "Image",
    "image_could_not_be_loaded": "Image could not be loaded",
'''
tr_adds = '''
    "tip_2_1": "Resim eklemek için ",
    "tip_2_2": " ifadesini kullanın",
    "image": "Resim",
    "image_could_not_be_loaded": "Resim yüklenemedi",
'''
d = d.replace('"tip_2": "Use <--image--> expression to add an image",', en_adds)
d = d.replace('"tip_2": "Resim eklemek için <--image--> ifadesini kullanın",', tr_adds)
open(f, 'w', encoding='utf-8').write(d)
