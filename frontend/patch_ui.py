import os
import re

print("Patching i18n.ts...")
with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

en_add = """      image_added_success: 'Image added successfully',
      image_add_error: 'Error adding image',
      image_deleted_success: 'Image deleted successfully',
      image_delete_error: 'Error deleting image',
      order_updated_success: 'Order updated successfully',
      order_update_error: 'Error updating order',
      image_size_updated: 'Image size updated',
      image_size_update_error: 'Error updating image size',
      content_updated_success: 'Content updated successfully',
      content_deleted_success: 'Content deleted successfully',
      select_only_image: 'Please select only image files',
      file_size_max_10mb: 'File size must be less than 10MB',
      ai_formatting: 'AI is formatting...',
      category_added: 'Category added',
      category_exists: 'Category already exists',
      content_added_success: 'Content added successfully',
"""
tr_add = """      image_added_success: 'Resim başarıyla eklendi',
      image_add_error: 'Resim eklenirken hata oluştu',
      image_deleted_success: 'Resim başarıyla silindi',
      image_delete_error: 'Resim silinirken hata oluştu',
      order_updated_success: 'Sıralama güncellendi',
      order_update_error: 'Sıralama güncellenirken hata oluştu',
      image_size_updated: 'Resim boyutu güncellendi',
      image_size_update_error: 'Resim boyutu güncellenirken hata oluştu',
      content_updated_success: 'İçerik güncellendi',
      content_deleted_success: 'İçerik silindi',
      select_only_image: 'Lütfen sadece resim dosyası seçin',
      file_size_max_10mb: 'Dosya boyutu 10MB\\'dan küçük olmalı',
      ai_formatting: 'Yapay zeka formatlıyor...',
      category_added: 'Kategori eklendi',
      category_exists: 'Aynı isimde bir kategori zaten var',
      content_added_success: 'İçerik başarıyla eklendi',
"""
ar_add = """      image_added_success: 'تمت إضافة الصورة بنجاح',
      image_add_error: 'خطأ في إضافة الصورة',
      image_deleted_success: 'تم حذف الصورة بنجاح',
      image_delete_error: 'خطأ في حذف الصورة',
      order_updated_success: 'تم تحديث الترتيب بنجاح',
      order_update_error: 'خطأ في تحديث الترتيب',
      image_size_updated: 'تم تحديث حجم الصورة',
      image_size_update_error: 'خطأ في تحديث حجم الصورة',
      content_updated_success: 'تم تحديث المحتوى بنجاح',
      content_deleted_success: 'تم حذف المحتوى بنجاح',
      select_only_image: 'يرجى تحديد ملفات الصور فقط',
      file_size_max_10mb: 'يجب أن يكون حجم الملف أقل من 10 ميغابايت',
      ai_formatting: 'الذكاء الاصطناعي يقوم بالتنسيق...',
      category_added: 'تمت اضافة الفئة',
      category_exists: 'الفئة موجودة بالفعل',
      content_added_success: 'تمت إضافة المحتوى بنجاح',
"""

text = text.replace("headings: 'Headings',", en_add + "      headings: 'Headings',")
text = text.replace("headings: 'Ba\u015fl\u0131klar',", tr_add + "      headings: 'Ba\u015fl\u0131klar',")
text = text.replace("headings: '\u0627\u0644\u0639\u0646\u0627\u0648\u064a\u0646',", ar_add + "      headings: '\u0627\u0644\u0639\u0646\u0627\u0648\u064a\u0646',")

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Patching ContentImageManager.tsx...")
with open('src/admin/components/ContentImageManager.tsx', 'r', encoding='utf-8') as f:
    cim = f.read()

# Add t hook
if 'useTranslation' not in cim:
    cim = cim.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useTranslation } from "react-i18next";')
    cim = cim.replace('export default function ContentImageManager({', 'export default function ContentImageManager({\n  const { t } = useTranslation();')
else:
    if 'useTranslation();' not in cim:
           cim = re.sub(r'(export default function ContentImageManager\([^)]+\)\s*\{)', r'\1\n  const { t } = useTranslation();', cim)

# Replace static strings
replacements = {
    '"Resim başarıyla yüklendi"': 't("image_added_success")',
    '"Resimler yüklenirken hata oluştu"': 't("image_add_error")',
    '"Resim başarıyla eklendi"': 't("image_added_success")',
    '"Resim eklenirken hata oluştu"': 't("image_add_error")',
    '"Resim başarıyla silindi"': 't("image_deleted_success")',
    '"Resim silinirken hata oluştu"': 't("image_delete_error")',
    '"Sıralama güncellendi"': 't("order_updated_success")',
    '"Sıralama güncellenirken hata oluştu"': 't("order_update_error")',
    '"Resim boyutu güncellendi"': 't("image_size_updated")',
    '"Resim boyutu güncellenirken hata oluştu"': 't("image_size_update_error")',
    '"Lütfen sadece resim dosyası seçin"': 't("select_only_image")',
    '"Dosya boyutu 10MB\'dan küçük olmalı"': 't("file_size_max_10mb")',
    '>\n                      Sil\n': '>\n                      {t("delete")}\n'
}

for k, v in replacements.items():
    cim = cim.replace(k, v)

with open('src/admin/components/ContentImageManager.tsx', 'w', encoding='utf-8') as f:
    f.write(cim)


print("Patching AdminApp.tsx...")
with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    aa = f.read()

aa = aa.replace('"Kategori eklendi"', 't("category_added")')
aa = aa.replace('"Aynı isimde bir kategori zaten var"', 't("category_exists")')
aa = aa.replace('"İçerik başarıyla eklendi!"', 't("content_added_success")')
aa = aa.replace('showNotification("İçerik güncellendi"', 'showNotification(t("content_updated_success")')
aa = aa.replace('showNotification("Güncelleme hatası"', 'showNotification(t("content_update_error")')
aa = aa.replace('showNotification("İçerik silindi"', 'showNotification(t("content_deleted_success")')
aa = aa.replace('showNotification("Silme hatası"', 'showNotification(t("content_delete_error")')

with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(aa)

print("Done")
