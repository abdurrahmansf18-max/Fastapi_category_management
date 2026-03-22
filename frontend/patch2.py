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

en_str = '''      no_heading_yet: "No heading in this category",
      create_first_heading: "Create your first heading",
      no_subheading_yet: "No subheading yet",
      create_first_subheading: "Create your first subheading",
      usage_tips: "Usage Tips",
      no_admin_yet: "No admin user yet",
'''
text = inject(text, 'en', en_str)

tr_str = '''      no_heading_yet: "Bu kategoride henüz başlık yok",
      create_first_heading: "İlk başlığınızı oluşturun",
      no_subheading_yet: "Henüz alt başlık yok",
      create_first_subheading: "İlk alt başlığınızı oluşturun",
      usage_tips: "Kullanım İpuçları",
      no_admin_yet: "Henüz admin yetkilisi yok",
'''
text = inject(text, 'tr', tr_str)

ar_str = '''      no_heading_yet: "لا توجد عناوين في هذه الفئة",
      create_first_heading: "أنشئ عنوانك الأول",
      no_subheading_yet: "لا يوجد عنوان فرعي حتى الآن",
      create_first_subheading: "أنشئ عنوانك الفرعي الأول",
      usage_tips: "نصائح الاستخدام",
      no_admin_yet: "لا يوجد مسؤول حتى الآن",
'''
text = inject(text, 'ar', ar_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
