import re

with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Instead of blindly using c.description || h.description everywhere, put them back to what they were locally based on iterating the maps.
# The first block maps categories: "c"
text = re.sub(r'(updateCategory\(c\.id, \{.*?.*?.*?const description = await showPrompt\(t\("edit_description"\),\s*)c\.description \|\| h\.description( \|\| "", t\("description_optional"\)\);)', r'\1c.description\2', text, flags=re.DOTALL)

# Let's do it precisely matching the surrounding text.
# Block 1: Categories. c is defined, h is not.
text = text.replace(
    'const description = await showPrompt(t("edit_description"), c.description || h.description || "", t("description_optional"));\n                              updateCategory(c.id, {',
    'const description = await showPrompt(t("edit_description"), c.description || "", t("description_optional"));\n                              updateCategory(c.id, {'
)

# Block 2 & 3: Headings. h is defined, c is not.
text = text.replace(
    'const description = await showPrompt(t("edit_description"), c.description || h.description || "", t("description_optional"));\n                                    updateHeading(h.id, {',
    'const description = await showPrompt(t("edit_description"), h.description || "", t("description_optional"));\n                                    updateHeading(h.id, {'
)
text = text.replace(
    'const description = await showPrompt(t("edit_description"), c.description || h.description || "", t("description_optional"));\n                                      updateHeading(h.id, {',
    'const description = await showPrompt(t("edit_description"), h.description || "", t("description_optional"));\n                                      updateHeading(h.id, {'
)


with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done_fix_vars")
