with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's fix duplicated keys inserted by previous script
text = text.replace("      main_headings: 'Main Headings',\n      sub_headings: 'Subheadings',\n\n      main_headings: 'Main Headings',\n      sub_headings: 'Subheadings',\n", "      main_headings: 'Main Headings',\n      sub_headings: 'Subheadings',\n")

# For other langs
import re
text = re.sub(r'      main_headings: \'Ana BaÅŸlÄ±klar\',\n      sub_headings: \'Alt BaÅŸlÄ±klar\',\n\n      headings: \'BaÅŸlÄ±klar\',\n      main_headings: \'Ana BaÅŸlÄ±klar\',\n      sub_headings: \'Alt BaÅŸlÄ±klar\',\n', "      headings: 'BaÅŸlÄ±klar',\n      main_headings: 'Ana Başlıklar',\n      sub_headings: 'Alt Başlıklar',\n", text)

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(text)
