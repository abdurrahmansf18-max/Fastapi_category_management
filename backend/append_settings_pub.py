import re

path = 'app/routers/public.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

append_code = """

@public_router.get("/settings")
async def get_site_settings():
    rows = await fetch_all("SELECT key, value FROM site_setting")
    settings = {row["key"]: row["value"] for row in rows}
    # Ensure default values exist in return
    if "site_title" not in settings: settings["site_title"] = "Fastapi"
    if "site_logo" not in settings: settings["site_logo"] = ""
    return settings
"""
if "@public_router.get(\"/settings\")" not in content:
    with open(path, 'a', encoding='utf-8') as f:
        f.write(append_code)
