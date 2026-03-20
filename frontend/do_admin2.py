import re

i18nPath = 'src/i18n.ts'
with open(i18nPath, 'r', encoding='utf-8') as f:
    i18nText = f.read()

keys = {
    'select_category_first': ['Select a category first', 'Önce bir kategori seçin', 'اختر فئة أولاً'],
    'select_category_to_view_headings': ['Select a category to view headings', 'Başlıkları görüntülemek için bir kategori seçin', 'اختر فئة لعرض العناوين'],
    'select_heading_first': ['Select a heading first', 'Önce bir başlık seçin', 'اختر عنواناً أولاً'],
    'select_heading_to_view_contents': ['Select a heading to view contents', 'İçerikleri görüntülemek için bir başlık seçin', 'اختر عنواناً لعرض المحتويات'],
    'admin_users_desc': ['Manage admin users', 'Admin kullanıcılarını yönetin', 'إدارة مستخدمي الإدارة'],
    'add_admin': ['Add Admin', 'Admin Ekle', 'إضافة مسؤول'],
    'email': ['Email', 'E-posta', 'البريد الإلكتروني'],
    'add_new_admin': ['Add New Admin', 'Yeni Admin Ekle', 'إضافة مسؤول جديد'],
    'new_title_name': ['New Title Name', 'Yeni Başlık Adı', 'اسم العنوان الجديد'],
    'add_title': ['Add Title', 'Başlık Ekle', 'إضافة عنوان'],
    'new_subtitle_name': ['New Subtitle Name', 'Yeni Alt Başlık Adı', 'اسم العنوان الفرعي الجديد'],
    'add_subtitle': ['Add Subtitle', 'Alt Başlık Ekle', 'إضافة عنوان فرعي']
}

enAdds = ''
trAdds = ''
arAdds = ''

for k, v in keys.items():
    enAdds += f"      {k}: '{v[0]}',\n"
    trAdds += f"      {k}: '{v[1]}',\n"
    arAdds += f"      {k}: '{v[2]}',\n"

parts = re.split(r"admin_button:\s*'[^']+',", i18nText)

if len(parts) == 4:
    i18nText = parts[0] + enAdds + "admin_button: 'Admin'," + parts[1] + trAdds + "admin_button: 'Admin'," + parts[2] + arAdds + "admin_button: 'المسؤول'," + parts[3]
    with open(i18nPath, 'w', encoding='utf-8') as f:
        f.write(i18nText)

# AdminApp.tsx fixes
with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    adminApp = f.read()

adminApp = re.sub(r'Doküman başlıklarını ve alt başlıklarını yönetin', '{t("headings_desc")}', adminApp)
adminApp = re.sub(r'>\s*Önce bir kategori seçin\s*</p>', '>{t("select_category_first")}</p>', adminApp)
adminApp = re.sub(r'>\s*Başlıkları görüntülemek için bir kategori seçin\s*</p>', '>{t("select_category_to_view_headings")}</p>', adminApp)

adminApp = adminApp.replace('Doküman içeriklerini yönetin', '{t("contents_desc")}')
adminApp = re.sub(r'>\s*Önce bir başlık seçin\s*</p>', '>{t("select_heading_first")}</p>', adminApp)
adminApp = re.sub(r'>\s*İçerikleri görüntülemek için bir başlık seçin\s*</p>', '>{t("select_heading_to_view_contents")}</p>', adminApp)

adminApp = re.sub(r'<h2>\s*Admin Kullanıcıları\s*</h2>', '<h2>{t("admin_users")}</h2>', adminApp)
adminApp = re.sub(r'>\s*Admin kullanıcılarını yönetin\s*</p>', '>{t("admin_users_desc")}</p>', adminApp)

adminApp = adminApp.replace('{theme === "dark" ? "🌙 Dark" : "☀️ Light"}', '{theme === "dark" ? "🌙" : "☀️"}')

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(adminApp)


# CreateCategoryForm
with open('src/admin/components/CreateCategoryForm.tsx', 'r', encoding='utf-8') as f:
    ccf = f.read()
ccf = re.sub(r'Yeni\s*Kategori Ekle', '{t("add_new_category")}', ccf)
ccf = re.sub(r'<span>\+</span>\s*Kategori Ekle', '<span>+</span> {t("add_category")}', ccf)
with open('src/admin/components/CreateCategoryForm.tsx', 'w', encoding='utf-8') as f:
    f.write(ccf)

# CreateAdminForm
with open('src/admin/components/CreateAdminForm.tsx', 'r', encoding='utf-8') as f:
    caf = f.read()
caf = re.sub(r'Yeni\s*Admin Ekle', '{t("add_new_admin")}', caf)
caf = caf.replace('placeholder="E-posta"', 'placeholder={t("email")}')
caf = re.sub(r'>\s*Admin Ekle\s*</button>', '>\n          {t("add_admin")}\n        </button>', caf)
with open('src/admin/components/CreateAdminForm.tsx', 'w', encoding='utf-8') as f:
    f.write(caf)

# CreateH1Form
with open('src/admin/components/CreateH1Form.tsx', 'r', encoding='utf-8') as f:
    ch1 = f.read()
if 'useTranslation' not in ch1:
    ch1 = 'import { useTranslation } from "react-i18next";\n' + ch1
    ch1 = ch1.replace('const [title, setTitle] = useState("");', 'const { t } = useTranslation();\n  const [title, setTitle] = useState("");')
ch1 = ch1.replace('placeholder="Yeni Başlık Adı"', 'placeholder={t("new_title_name")}')
ch1 = ch1.replace('placeholder="Yeni BaÅŸlÄ±k AdÄ±"', 'placeholder={t("new_title_name")}')
ch1 = re.sub(r'\+\s*Başlık Ekle', '+ {t("add_title")}', ch1)
ch1 = re.sub(r'\+\s*BaÅŸlÄ±k Ekle', '+ {t("add_title")}', ch1)
with open('src/admin/components/CreateH1Form.tsx', 'w', encoding='utf-8') as f:
    f.write(ch1)

# CreateH2Form
with open('src/admin/components/CreateH2Form.tsx', 'r', encoding='utf-8') as f:
    ch2 = f.read()
if 'useTranslation' not in ch2:
    ch2 = 'import { useTranslation } from "react-i18next";\n' + ch2
    ch2 = ch2.replace('const [title, setTitle] = useState("");', 'const { t } = useTranslation();\n  const [title, setTitle] = useState("");')
ch2 = ch2.replace('placeholder="Yeni Alt Başlık Adı"', 'placeholder={t("new_subtitle_name")}')
ch2 = ch2.replace('placeholder="Yeni Alt BaÅŸlÄ±k AdÄ±"', 'placeholder={t("new_subtitle_name")}')
ch2 = re.sub(r'\+\s*Alt Başlık Ekle', '+ {t("add_subtitle")}', ch2)
ch2 = re.sub(r'\+\s*Alt BaÅŸlÄ±k Ekle', '+ {t("add_subtitle")}', ch2)
with open('src/admin/components/CreateH2Form.tsx', 'w', encoding='utf-8') as f:
    f.write(ch2)

print("Python mapping complete")
