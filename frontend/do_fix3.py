import re

with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'showPrompt\(t\("edit_description"\),\s*Ã¼,\s*t\("description_optional"\)\);', r'showPrompt(t("edit_description"), c.description || "", t("description_optional"));', text, count=1)
text = re.sub(r'showPrompt\(t\("edit_description"\),\s*Ã¼,\s*t\("description_optional"\)\);', r'showPrompt(t("edit_description"), h.description || "", t("description_optional"));', text, count=2)

text = re.sub(r'showPrompt\(t\("edit_description"\),\s*[^,]+,\s*t\("description_optional"\)\)', r'showPrompt(t("edit_description"), item.description || "", t("description_optional"))', text)

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done3")
