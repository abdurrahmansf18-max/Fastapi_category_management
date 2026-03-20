import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

def fix_dups(content):
    res = []
    lines = content.splitlines()
    seen = set()
    for line in lines:
        if line.strip() == '':
            res.append(line)
            continue
        
        m = re.match(r'^(\s+)([\w_]+):\s*(.*)$', line)
        if m:
            indent = m.group(1)
            key = m.group(2)
            if len(indent) >= 6:  # Inside a translation bundle
                if key in seen:
                    pass # Skip duplicate
                else:
                    seen.add(key)
                    res.append(line)
            else:
                 res.append(line)
                 if "translation:" in line:
                     seen = set()
        else:
            if "translation: {" in line:
                seen = set()
            res.append(line)
    return '\n'.join(res)

fixed = fix_dups(text)
with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(fixed)

print('Duplicate properties removed!')
