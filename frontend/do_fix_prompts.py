import re
with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Kategori Sil
text = re.sub(r'showConfirm\(\s*"Kategori Sil",\s*"Bu kategoriyi kal.*?\)\s*;', 'showConfirm(t("delete_category"), t("delete_category_desc"));', text, flags=re.DOTALL)
# BaÅŸlÄ±k Sil or Başlık Sil
text = re.sub(r'showConfirm\(\s*"Ba[^\"]*?[l|Ä|Å|Ä|\±]+k Sil",\s*"Bu ba[^\"]*?[l|Ä|Å|Ä|\±]*?Ä?[i|Ä|±]+ kal.*?\)\s*;', 'showConfirm(t("delete_title"), t("delete_title_desc"));', text, flags=re.DOTALL)

# prompt: Kategori
text = re.sub(r'showPrompt\(\s*"Kategori D[^\"]+zenle",\s*c\.name \|\| "",\s*"Yeni kategori ad.*?\)\s*;', 'showPrompt(t("edit_category"), c.name || "", t("new_category_name"));', text, flags=re.DOTALL)
# prompt: Başlık
text = re.sub(r'showPrompt\(\s*"Ba[^\"]+k D[^\"]+zenle",\s*h\.title \|\| "",\s*"Yeni ba[^\"]+k"\s*\)\s*;', 'showPrompt(t("edit_title_modal"), h.title || "", t("new_title"));', text, flags=re.DOTALL)
text = re.sub(r'showPrompt\(\s*"Alt Ba[^\"]+k D[^\"]+zenle",\s*h\.title \|\| "",\s*"Yeni alt ba[^\"]+k"\s*\)\s*;', 'showPrompt(t("edit_subtitle"), h.title || "", t("new_subtitle"));', text, flags=re.DOTALL)

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
