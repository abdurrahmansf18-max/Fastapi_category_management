import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Ekleme yapalım
en = "      headings: 'Headings',\n      main_headings: 'Main Headings',\n      sub_headings: 'Subheadings',\n"
tr = "      headings: 'BaÅŸlÄ±klar',\n      main_headings: 'Ana Başlıklar',\n      sub_headings: 'Alt Başlıklar',\n"
ar = "      headings: 'Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ†',\n      main_headings: 'العناوين الرئيسية',\n      sub_headings: 'العناوين الفرعية',\n"

text = text.replace("      headings: 'Headings',", en)
text = text.replace("      headings: 'BaÅŸlÄ±klar',", tr)
text = text.replace("      headings: 'Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ†',", ar)

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("done append")
