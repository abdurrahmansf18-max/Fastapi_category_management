f = 'src/shared/api/admin.ts'
with open(f, 'r', encoding='utf-8') as file:
    text = file.read()
if 'updateSettings:' not in text:
    text = text.replace('};', '  updateSettings: (data: { site_title?: string; site_logo?: string }) => http.put("/admin/settings", data),\n  uploadSiteLogo: (formData: FormData) => http.post("/admin/settings/logo", formData),\n};')
    with open(f, 'w', encoding='utf-8') as file:
        file.write(text)
