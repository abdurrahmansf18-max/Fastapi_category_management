import re

with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the incorrect item.description to c.description or h.description
text = re.sub(r'(showPrompt\(t\("edit_description"\),\s*)item\.description( \s*\|\|\s*"",\s*t\("description_optional"\)\))', r'\1c.description || h.description\2', text)


with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done_fix")
