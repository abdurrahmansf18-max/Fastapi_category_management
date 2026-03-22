import re
import os

i18n_path = r'C:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\i18n.ts'
with open(i18n_path, 'r', encoding='utf-8') as f:
    i18n_content = f.read()

# Missing translations
en_translations = """
    "no_category_yet": "No category yet",
    "create_first_category": "Create your first category",
    "no_heading_yet": "No heading in this category",
    "create_first_heading": "Create your first heading",
    "no_subheading_yet": "No subheading yet",
    "create_first_subheading": "Create your first subheading",
    "no_admin_yet": "No admin user yet",
    "create_first_admin": "Create your first admin user",
    "preview": "Preview",
    "usage_tips": "Usage Tips",
    "tip_1": "Create rich content using Markdown format",
    "tip_2": "Use <--image--> expression to add an image",
    "tip_3": "Images will be displayed in the content sequentially",
    "tip_4": "Adding alt text is important for SEO and accessibility"
"""

tr_translations = """
    "no_category_yet": "Henüz kategori yok",
    "create_first_category": "İlk kategorinizi oluşturun",
    "no_heading_yet": "Bu kategoride başlık yok",
    "create_first_heading": "İlk başlığınızı oluşturun",
    "no_subheading_yet": "Alt başlık yok",
    "create_first_subheading": "İlk alt başlığınızı oluşturun",
    "no_admin_yet": "Henüz admin kullanıcı yok",
    "create_first_admin": "İlk admin kullanıcıyı oluşturun",
    "preview": "Önizleme",
    "usage_tips": "Kullanım İpuçları",
    "tip_1": "Markdown formatını kullanarak zengin içerik oluşturun",
    "tip_2": "Resim eklemek için <--image--> ifadesini kullanın",
    "tip_3": "Resimler içerikte sırasıyla görüntülenecektir",
    "tip_4": "Alt metin eklemek SEO ve erişilebilirlik için önemlidir"
"""

# Insert into English translations
if '"no_category_yet"' not in i18n_content:
    en_pattern = r'(en:\s*\{\s*translation:\s*\{)'
    i18n_content = re.sub(en_pattern, r'\1' + en_translations + ',', i18n_content)

# Insert into Turkish translations
if '"no_category_yet"' not in i18n_content:
    tr_pattern = r'(tr:\s*\{\s*translation:\s*\{)'
    i18n_content = re.sub(tr_pattern, r'\1' + tr_translations + ',', i18n_content)

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(i18n_content)


# --- Fix AdminApp.tsx ---
admin_app_path = r'C:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\admin\AdminApp.tsx'
with open(admin_app_path, 'r', encoding='utf-8') as f:
    admin_content = f.read()

reps = {
    'Henüz kategori yok': '{t("no_category_yet")}',
    'İlk kategorinizi oluşturun': '{t("create_first_category")}',
    'Bu kategoride başlık yok': '{t("no_heading_yet")}',
    'İlk başlığınızı oluşturun': '{t("create_first_heading")}',
    'Alt başlık yok': '{t("no_subheading_yet")}',
    'İlk alt başlığınızı oluşturun': '{t("create_first_subheading")}',
    'Henüz admin kullanıcı yok': '{t("no_admin_yet")}',
    'İlk admin kullanıcıyı oluşturun': '{t("create_first_admin")}',
}
for k, v in reps.items():
    admin_content = admin_content.replace(k, v)

with open(admin_app_path, 'w', encoding='utf-8') as f:
    f.write(admin_content)


# --- Fix CreateContentForm.tsx ---
form_path = r'C:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\admin\components\CreateContentForm.tsx'
with open(form_path, 'r', encoding='utf-8') as f:
    form_content = f.read()

reps2 = {
    '>Önizleme<': '>{t("preview")}<',
    'Kullanım İpuçları': '{t("usage_tips")}',
    'Markdown formatını kullanarak zengin içerik oluşturun': '{t("tip_1")}',
    'Resim eklemek için &lt;--image--&gt; ifadesini kullanın': '{t("tip_2")}',
    'Resimler içerikte sırasıyla görüntülenecektir': '{t("tip_3")}',
    'Alt metin eklemek SEO ve erişilebilirlik için önemlidir': '{t("tip_4")}'
}
for k, v in reps2.items():
    form_content = form_content.replace(k, v)

with open(form_path, 'w', encoding='utf-8') as f:
    f.write(form_content)

print("Translation patch applied.")
