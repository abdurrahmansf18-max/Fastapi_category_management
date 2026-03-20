import json
import re

# i18n
with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    i18n = f.read()

enAdds = "      main_headings: 'Main Headings',\n      sub_headings: 'Subheadings',\n"
trAdds = "      main_headings: 'Ana Başlıklar',\n      sub_headings: 'Alt Başlıklar',\n"
arAdds = "      main_headings: 'العناوين الرئيسية',\n      sub_headings: 'العناوين الفرعية',\n"

parts = i18n.split("admin_button: 'Admin',")
if len(parts) == 4:
    i18n = parts[0] + enAdds + "admin_button: 'Admin'," + parts[1] + trAdds + "admin_button: 'Admin'," + parts[2] + arAdds + "admin_button: 'المسؤول'," + parts[3]
    with open('src/i18n.ts', 'w', encoding='utf-8') as f:
        f.write(i18n)

# app
with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'<span>Ana Ba[^\"]+l[^\"]+klar</span>', '<span>{t("main_headings")}</span>', text)
text = re.sub(r'<span>Alt Ba[^\"]+l[^\"]+klar</span>', '<span>{t("sub_headings")}</span>', text)
text = re.sub(r'<span>Ana Başlıklar</span>', '<span>{t("main_headings")}</span>', text)
text = re.sub(r'<span>Alt Başlıklar</span>', '<span>{t("sub_headings")}</span>', text)

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("done titles")
