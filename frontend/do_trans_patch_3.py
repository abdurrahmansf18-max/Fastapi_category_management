import re

f=r'C:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\i18n.ts'
d=open(f, encoding='utf-8').read()
d=d.replace('"image": "Image",', '"image": "Image",\n    "loading": "Loading...",')
d=d.replace('"image": "Resim",', '"image": "Resim",\n    "loading": "Yükleniyor...",')
open(f, 'w', encoding='utf-8').write(d)

f2=r'C:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\admin\components\CreateContentForm.tsx'
d2=open(f2, encoding='utf-8').read()
d2=d2.replace('Yükleniyor...', '{t("loading")}')
open(f2, 'w', encoding='utf-8').write(d2)
