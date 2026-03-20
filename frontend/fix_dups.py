import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# I will find duplicate blocks and remove them
def remove_dup(content):
    block = r\"      select_category_to_view_headings: '[^\n]+',\n      select_heading_first: '[^\n]+',\n      select_heading_to_view_contents: '[^\n]+',\n      admin_users_desc: '[^\n]+',\n      add_admin: '[^\n]+',\n      email: '[^\n]+',\n      add_new_admin: '[^\n]+',\n      new_title_name: '[^\n]+',\n      add_title: '[^\n]+',\n      new_subtitle_name: '[^\n]+',\n      add_subtitle: '[^\n]+',\n\"
    
    text2 = re.sub(block, \"\", content, count=3) # remove second repetition that i accidentally appended! wait I'll construct a better one to avoid removing both. Let's just fix it properly
    return text2

# Better regex logic
def fix_dups(content):
    res = []
    lines = content.splitlines()
    seen = set()
    for line in lines:
        if line.strip() == '':
            res.append(line)
            continue
        
        # Check if it is a translation property e.g. "key: 'value',"
        m = re.match(r'^(\s+)([\w_]+):\s*(.*)$', line)
        if m:
            indent = m.group(1)
            key = m.group(2)
            if indent == '      ':  # Inside a translation bundle
                if key in seen:
                    pass # Skip duplicate
                else:
                    seen.add(key)
                    res.append(line)
            else:
                 res.append(line)
            
            # if we encounter "translation: {" we reset seen
            if key == "translation":
                seen = set()
        else:
            res.append(line)
    return \"\n\".join(res)

fixed = fix_dups(text)
with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(fixed)

print('Duplicate properties removed!')
