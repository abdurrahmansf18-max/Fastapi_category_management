import re

file_path = r'c:\Users\abdur\Desktop\Fullstack\Fastapi\frontend\src\i18n.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add new keys to 'en'
en_match = re.search(r'en:\s*\{[^}]*translation:\s*\{', text)
if en_match:
    pos = en_match.end()
    text = text[:pos] + "\n      site_title_prompt: \"Site Title\",\n      site_title_success: \"Site title updated!\",\n      site_title_error: \"Error updating site title\",\n      upload_logo_prompt: \"Upload Logo?\",\n      upload_logo_desc: \"Type 'yes' to upload a new logo next\",\n      site_logo_success: \"Site logo updated!\",\n      site_logo_error: \"Error updating site logo\",\n      edit_site_title_logo: \"Edit Site Title & Logo\"," + text[pos:]

# Add new keys to 'tr'
tr_match = re.search(r'tr:\s*\{[^}]*translation:\s*\{', text)
if tr_match:
    pos = tr_match.end()
    text = text[:pos] + "\n      site_title_prompt: \"Site Başlığı\",\n      site_title_success: \"Site başlığı güncellendi!\",\n      site_title_error: \"Site başlığı güncellenirken hata oluştu\",\n      upload_logo_prompt: \"Logo Yüklensin mi?\",\n      upload_logo_desc: \"Yeni logo yüklemek için 'yes' yazın\",\n      site_logo_success: \"Site logosu güncellendi!\",\n      site_logo_error: \"Site logosu güncellenirken hata oluştu\",\n      edit_site_title_logo: \"Site Başlık ve Logosunu Düzenle\"," + text[pos:]

# Add new keys to 'ar'
ar_match = re.search(r'ar:\s*\{[^}]*translation:\s*\{', text)
if ar_match:
    pos = ar_match.end()
    text = text[:pos] + "\n      site_title_prompt: \"عنوان الموقع\",\n      site_title_success: \"تم تحديث عنوان الموقع!\",\n      site_title_error: \"خطأ في تحديث عنوان الموقع\",\n      upload_logo_prompt: \"تحميل الشعار؟\",\n      upload_logo_desc: \"اكتب 'yes' لتحميل شعار جديد\",\n      site_logo_success: \"تم تحديث شعار الموقع!\",\n      site_logo_error: \"خطأ في تحديث شعار الموقع\",\n      edit_site_title_logo: \"تعديل عنوان وشعار الموقع\"," + text[pos:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
