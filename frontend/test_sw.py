import sys
import re

def update_file(path, is_admin):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import if missing
    if 'LanguageSwitcher' not in content:
        import_stmt = "import LanguageSwitcher from '../shared/components/LanguageSwitcher';\n"
        if is_admin:
            content = re.sub(r'(import .*?;)', r'\1\n' + import_stmt, content, count=1)
        else:
            content = re.sub(r'(import .*?;)', r'\1\n' + import_stmt, content, count=1)

    # Insert LanguageSwitcher in the header/navbar
    if '<button\n              onClick={() => setTheme' in content:
        content = content.replace(
            '<button\n              onClick={() => setTheme',
            '<LanguageSwitcher />\n            <button\n              onClick={() => setTheme'
        )
    elif '<button onClick={() => setTheme' in content:
        content = content.replace(
            '<button onClick={() => setTheme',
            '<LanguageSwitcher />\n            <button onClick={() => setTheme'
        )
    elif 'onClick={() => setTheme' in content:
        # Fallback
        res = re.split(r'(<button[^>]*onClick={\(\) => setTheme.*?<\/button>)', content, flags=re.DOTALL)
        if len(res) > 1:
            content = res[0] + '<div className="flex items-center gap-4"><LanguageSwitcher />' + res[1] + '</div>' + res[2]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('src/admin/AdminApp.tsx', True)
update_file('src/user/PublicApp.tsx', False)
print('Added LanguageSwitcher')
