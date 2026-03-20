import re

with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'>\s*Ä°ptal\s*<\/button>', '>{t("cancel")}</button>', text)
text = re.sub(r'>\s*İptal\s*<\/button>', '>{t("cancel")}</button>', text)

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done4")
