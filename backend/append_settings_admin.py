import re

path = 'app/routers/admin.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

append_code = """

# ---- Site Settings ----
from app.schemas import SiteSettingsUpdate

@admin_router.put("/settings")
async def update_site_settings(payload: SiteSettingsUpdate, _=Depends(get_current_admin)):
    if payload.site_title is not None:
        await execute("INSERT INTO site_setting (key, value) VALUES ('site_title', :val) ON CONFLICT (key) DO UPDATE SET value = :val", {"val": payload.site_title})
    if payload.site_logo is not None:
        await execute("INSERT INTO site_setting (key, value) VALUES ('site_logo', :val) ON CONFLICT (key) DO UPDATE SET value = :val", {"val": payload.site_logo})
    return {"message": "Settings updated"}

@admin_router.post("/settings/logo")
async def upload_site_logo(request: Request, file: UploadFile = File(...), _=Depends(get_current_admin)):
    file_info = await storage.save_file(file, "images")
    abs_url = _abs_url(request, file_info["url"])
    await execute("INSERT INTO site_setting (key, value) VALUES ('site_logo', :val) ON CONFLICT (key) DO UPDATE SET value = :val", {"val": abs_url})
    return {"site_logo": abs_url}
"""
if "@admin_router.put(\"/settings\")" not in content:
    with open(path, 'a', encoding='utf-8') as f:
        f.write(append_code)
