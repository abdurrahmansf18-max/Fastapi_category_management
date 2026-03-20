import re

i18nPath = 'src/i18n.ts'
with open(i18nPath, 'r', encoding='utf-8') as f:
    text = f.read()

# removing duplicate section 
text = re.sub(r'(\s+select_category_first:\s+\'[^\']+\',\n\s+select_category_to_view_headings:\s+\'[^\']+\',\n\s+select_heading_first:\s+\'[^\']+\',\n\s+select_heading_to_view_contents:\s+\'[^\']+\',\n\s+admin_users_desc:\s+\'[^\']+\',\n\s+add_admin:\s+\'[^\']+\',\n\s+email:\s+\'[^\']+\',\n\s+add_new_admin:\s+\'[^\']+\',\n\s+new_title_name:\s+\'[^\']+\',\n\s+add_title:\s+\'[^\']+\',\n\s+new_subtitle_name:\s+\'[^\']+\',\n\s+add_subtitle:\s+\'[^\']+\',\n)\s+select_category_first:\s+\'[^\']+\',', r'\1', text)

with open(i18nPath, 'w', encoding='utf-8') as f:
    f.write(text)
print(\"Fixed dupes\")
