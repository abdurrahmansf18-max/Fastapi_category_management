import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = 'src/i18n.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

def inject(text, lang_block, insert_str):
    match = re.search(r'' + lang_block + ':\s*\{[^}]*translation:\s*\{', text)
    if match:
        pos = match.end()
        text = text[:pos] + "\n" + insert_str + text[pos:]
    return text

en_str = '''      tip_1: "Create rich content using Markdown format",
      tip_2_1: "Use the",
      tip_2_2: "tag to insert images",
      tip_3: "Images will be displayed sequentially in the content",
      tip_4: "Adding alt text is important for SEO and accessibility",
'''
text = inject(text, 'en', en_str)

tr_str = '''      tip_1: "Markdown formatını kullanarak zengin içerik oluşturun",
      tip_2_1: "Resim eklemek için",
      tip_2_2: "etiketini kullanın",
      tip_3: "Resimler içerikte sırasıyla görüntülenecektir",
      tip_4: "Alt metin eklemek SEO ve erişilebilirlik için önemlidir",
'''
text = inject(text, 'tr', tr_str)

ar_str = '''      tip_1: "قم بإنشاء محتوى غني باستخدام تنسيق Markdown",
      tip_2_1: "استخدم علامة",
      tip_2_2: "لإدراج الصور",
      tip_3: "سيتم عرض الصور بالتسلسل في المحتوى",
      tip_4: "إضافة النص البديل مهم لتحسين محركات البحث وسهولة الوصول",
'''
text = inject(text, 'ar', ar_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
