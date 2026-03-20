with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'showPrompt(t("edit_description"), c.description || h.description || "", t("description_optional"));' in line:
        if 'c.description' in lines[i+2] or 'c.name' in lines[i+2] or 'updateCategory' in lines[i+1]:
            lines[i] = line.replace('c.description || h.description || ""', 'c.description || ""')
        elif 'updateHeading' in lines[i+1]:
            lines[i] = line.replace('c.description || h.description || ""', 'h.description || ""')

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("done_loop")
