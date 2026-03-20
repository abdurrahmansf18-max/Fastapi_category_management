import os
import re

directories = ['src/admin', 'src/user', 'src/admin/components', 'src/user/components']

replacements = {
    r'"Giriş Yap"': '{t(\'Login\')}',
    r'>Giriş Yap<': '>{t(\'Login\')}<',
    r'"Hoş Geldiniz"': '{t(\'Welcome\')}',
    r'>Hoş Geldiniz<': '>{t(\'Welcome\')}<',
    r'"Yönetim Paneli"': '{t(\'admin_panel\')}',
    r'>Yönetim Paneli<': '>{t(\'admin_panel\')}<',
    r'"Kullanıcı Adı"': '{t(\'username\')}',
    r'"Şifre"': '{t(\'password\')}',
    r'placeholder="Kullanıcı Adı"': 'placeholder={t(\'username\')}',
    r'placeholder="E-posta adresi"': 'placeholder={t(\'email_placeholder\')}',
    r'placeholder="Şifre"': 'placeholder={t(\'password_placeholder\')}',
    r'"Oluştur"': '{t(\'create\')}',
    r'>Oluştur<': '>{t(\'create\')}<',
    r'"Düzenle"': '{t(\'edit\')}',
    r'>Düzenle<': '>{t(\'edit\')}<',
    r'"Sil"': '{t(\'delete\')}',
    r'>Sil<': '>{t(\'delete\')}<',
    r'"İptal"': '{t(\'cancel\')}',
    r'>İptal<': '>{t(\'cancel\')}<',
    r'"Kaydet"': '{t(\'save\')}',
    r'>Kaydet<': '>{t(\'save\')}<',
    r'"Başlık"': '{t(\'title\')}',
    r'>Başlık<': '>{t(\'title\')}<',
    r'"İçerik"': '{t(\'content\')}',
    r'>İçerik<': '>{t(\'content\')}<',
    r'"Kategori"': '{t(\'category\')}',
    r'>Kategori<': '>{t(\'category\')}<',
    r'"Yeni Kategori"': '{t(\'new_category\')}',
    r'>Yeni Kategori<': '>{t(\'new_category\')}<',
    r'"Yeni Başlık"': '{t(\'new_heading\')}',
    r'>Yeni Başlık<': '>{t(\'new_heading\')}<',
    r'"Yeni İçerik"': '{t(\'new_content\')}',
    r'>Yeni İçerik<': '>{t(\'new_content\')}<',
    r'İçerik seçilmedi\.': '{t(\'empty_content\')}',
    r'Resimleri Yönet': '{t(\'manage_images\')}',
    r'Çıkış Yap': '{t(\'Logout\')}',
    r'Kategori, başlık, alt başlık veya içerikte arama\.\.\.': '{t(\'search_placeholder\')}',
    r'>Ara<': '>{t(\'search\')}<',
    r'"Ara\.\.\."': '{t(\'search\')}',
    r'"Geri"': '{t(\'back\')}',
    r'>Geri<': '>{t(\'back\')}<',
    r'Kategori, başlık veya içerik arayabilirsiniz': '{t(\'info_search_tips\')}',
    r'>Sonuç bulunamadı<': '>{t(\'no_results\')}<',
    r'Karanlık Mod': '{t(\'dark_mode\')}',
    r'Aydınlık Mod': '{t(\'light_mode\')}'
}

for d in directories:
    if not os.path.exists(d): continue
    for f in os.listdir(d):
        if f.endswith('.tsx'):
            p = os.path.join(d, f)
            with open(p, 'r', encoding='utf-8') as file:
                content = file.read()
            
            orig_content = content
            for k, v in replacements.items():
                content = re.sub(k, v, content)
                
            # Try to inject import if we translated something
            if content != orig_content:
                if 'useTranslation' not in content:
                    content = "import { useTranslation } from 'react-i18next';\n" + content
                
                # Try to inject const { t } = useTranslation();
                # Find functional component definitions
                # basic regex to find the first component definition to insert inside
                if 'const { t } = useTranslation();' not in content:
                    content = re.sub(r'(export default function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)', r'\1\n  const { t } = useTranslation();\n', content, count=1)
                    content = re.sub(r'(export function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)', r'\1\n  const { t } = useTranslation();\n', content, count=1)
                    content = re.sub(r'(const [a-zA-Z0-9_]+\s*=\s*(?:function)?\s*\([^)]*\)\s*=>\s*\{)', r'\1\n  const { t } = useTranslation();\n', content, count=1)

            with open(p, 'w', encoding='utf-8') as file:
                file.write(content)
                
print("Donereplacing!")
