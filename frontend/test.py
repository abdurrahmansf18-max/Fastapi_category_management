import json

data = {
    'en': {
        'translation': {
            'Welcome': 'Welcome', 'Login': 'Login', 'Logout': 'Logout',
            'language': 'Language', 'en': 'English', 'tr': 'Turkish', 'ar': 'Arabic',
            'search': 'Search...', 'create': 'Create', 'edit': 'Edit', 'delete': 'Delete',
            'cancel': 'Cancel', 'save': 'Save', 'title': 'Title', 'content': 'Content',
            'category': 'Category', 'new_category': 'New Category', 'new_heading': 'New Heading',
            'new_content': 'New Content', 'empty_content': 'No content selected.',
            'admin_panel': 'Admin Panel', 'username': 'Username', 'password': 'Password',
            'manage_images': 'Manage Images', 'dark_mode': 'Dark Mode', 'light_mode': 'Light Mode',
            'email': 'Email', 'error': 'Error', 'success': 'Success', 'back': 'Back',
            'no_results': 'No results found', 'search_placeholder': 'Search category, heading, subheading or content...',
            'type_category': 'Category', 'type_heading': 'Heading', 'type_content': 'Content',
            'info_search_tips': 'You can search for categories, headings or content',
            'dashboard': 'Dashboard', 'email_placeholder': 'Email address', 'password_placeholder': 'Password'
        }
    },
    'tr': {
        'translation': {
            'Welcome': 'Hoş Geldiniz', 'Login': 'Giriş Yap', 'Logout': 'Çıkış Yap',
            'language': 'Dil', 'en': 'İngilizce', 'tr': 'Türkçe', 'ar': 'Arapça',
            'search': 'Ara...', 'create': 'Oluştur', 'edit': 'Düzenle', 'delete': 'Sil',
            'cancel': 'İptal', 'save': 'Kaydet', 'title': 'Başlık', 'content': 'İçerik',
            'category': 'Kategori', 'new_category': 'Yeni Kategori', 'new_heading': 'Yeni Başlık',
            'new_content': 'Yeni İçerik', 'empty_content': 'İçerik seçilmedi.',
            'admin_panel': 'Yönetim Paneli', 'username': 'Kullanıcı Adı', 'password': 'Şifre',
            'manage_images': 'Resimleri Yönet', 'dark_mode': 'Karanlık Mod', 'light_mode': 'Aydınlık Mod',
            'email': 'E-posta', 'error': 'Hata', 'success': 'Başarılı', 'back': 'Geri',
            'no_results': 'Sonuç bulunamadı', 'search_placeholder': 'Kategori, başlık, alt başlık veya içerikte arama...',
            'type_category': 'Kategori', 'type_heading': 'Başlık', 'type_content': 'İçerik',
            'info_search_tips': 'Kategori, başlık veya içerik arayabilirsiniz',
            'dashboard': 'Yönetim Paneli', 'email_placeholder': 'E-posta adresi', 'password_placeholder': 'Şifre'
        }
    },
    'ar': {
        'translation': {
            'Welcome': 'مرحباً', 'Login': 'تسجيل الدخول', 'Logout': 'تسجيل الخروج',
            'language': 'اللغة', 'en': 'الإنجليزية', 'tr': 'التركية', 'ar': 'العربية',
            'search': 'بحث...', 'create': 'إنشاء', 'edit': 'تعديل', 'delete': 'حذف',
            'cancel': 'إلغاء', 'save': 'حفظ', 'title': 'العنوان', 'content': 'المحتوى',
            'category': 'فئة', 'new_category': 'فئة جديدة', 'new_heading': 'عنوان جديد',
            'new_content': 'محتوى جديد', 'empty_content': 'لم يتم تحديد محتوى.',
            'admin_panel': 'لوحة الإدارة', 'username': 'اسم المستخدم', 'password': 'كلمة المرور',
            'manage_images': 'إدارة الصور', 'dark_mode': 'الوضع المظلم', 'light_mode': 'الوضع الفاتح',
            'email': 'البريد الإلكتروني', 'error': 'خطأ', 'success': 'نجاح', 'back': 'رجوع',
            'no_results': 'لا توجد نتائج', 'search_placeholder': 'بحث في الفئة، العنوان، أو المحتوى...',
            'type_category': 'فئة', 'type_heading': 'عنوان', 'type_content': 'محتوى',
            'info_search_tips': 'يمكنك البحث عن فئات أو عناوين أو محتوى',
            'dashboard': 'لوحة القيادة', 'email_placeholder': 'البريد الإلكتروني', 'password_placeholder': 'كلمة المرور'
        }
    }
}

template = f'''import i18n from 'i18next';
import {{ initReactI18next }} from 'react-i18next';

const resources = {json.dumps(data, ensure_ascii=False, indent=2)};

i18n
  .use(initReactI18next)
  .init({{
    resources,
    lng: 'tr',
    fallbackLng: 'en',
    interpolation: {{
      escapeValue: false,
    }}
  }});

export default i18n;
'''

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(template)
