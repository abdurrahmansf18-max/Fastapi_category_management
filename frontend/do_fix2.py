import re

with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Heading Delete
text = re.sub(r'showConfirm\(\s*"Ba(Å|ş)l(Ä|ı)k Sil",\s*"Bu ba(Å|ş)l(Ä|ı)(Ä|ğ)(Ä|ı) kal(Ä|ı)c(Ä|ı) olarak silmek istiyor musun\? \(Alt ba(Å|ş)l(Ä|ı)klar/(\Ä|İ)(Ã|ç)erikler de silinir\)"\s*\);', 'showConfirm(t("delete_title"), t("delete_title_desc"));', text, flags=re.DOTALL)

# Password prompt
text = re.sub(r'showPrompt\(\s*"(\Å|Ş)ifre De(Ä|ğ)i(\Å|ş)tir",\s*"",\s*"Yeni (\Å|ş)ifre:"\s*\)', 'showPrompt(t("change_password"), "", t("new_password_colon"))', text)

# Sort Order
text = re.sub(r'showPrompt\(\s*"S(Ä|ı)ra D(Ã|ü)zenle",\s*String\((.*?)\),\s*"S(Ä|ı)ra \(int\)"\s*\)', r'showPrompt(t("edit_order"), String(\3), t("order_int"))', text)

# Description Edit
text = re.sub(r'showPrompt\(\s*"A(Ã|ç)(Ä|ı)klama D(Ã|ü)zenle",\s*(.*?),\s*t\("description_optional"\)\s*\)', r'showPrompt(t("edit_description"), \4, t("description_optional"))', text)
text = re.sub(r'showPrompt\(\s*"A(Ã|ç)(Ä|ı)klama D(Ã|ü)zenle",\s*(.*?),\s*"{t\(\'description_optional\'\)}"\s*\)', r'showPrompt(t("edit_description"), \3, t("description_optional"))', text)


# Content Edit
text = re.sub(r'showPrompt\(\s*"(\Ä|İ)(°)?(Ã|ç)erik D(Ã|ü)zenle",\s*c\.body,\s*"Yeni (i|i)(Ã|ç)erik:"\s*\)', 'showPrompt(t("edit_content"), c.body, t("new_content_colon"))', text)

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done2")
