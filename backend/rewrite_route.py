import os
import re

file_path = 'C:/Users/abdur/Desktop/Fullstack/Fastapi/backend/app/routers/admin.py'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# find where it says @admin_router.post(\"/format-markdown\")
idx = text.find('@admin_router.post("/format-markdown")')
if idx != -1:
    text = text[:idx]

code = '''
import os
import google.generativeai as genai
from pydantic import BaseModel

class FormatMarkdownRequest(BaseModel):
    text: str

@admin_router.post("/format-markdown")
async def format_markdown(req: FormatMarkdownRequest, _: dict = Depends(get_current_admin)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on server")
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f\"\"\"Sen profesyonel bir Markdown formatlayıcısın. Sana verilen metni zengin Markdown formatına çevir.

Kurallar:
1. Kod parçalarını (\\\python vb.) aynı şekilde koru.
2. Listeleri (-, 1.) aynı şekilde alt alta koru.
3. Başlıkları (#) uygun şekilde koru.
4. Paragrafları bozma, satır arası boşluk koy.
5. Sadece Markdown kodunu döndür, baştaki ve sondaki açıklayıcı markdown ibarelerini alma.

Metin:
{req.text}\"\"\"
        response = model.generate_content(prompt)
        text = response.text
        if text.startswith("\\\markdown") and text.endswith("\\\"):
            text = text[11:-3].strip()
        elif text.startswith("\\\") and text.endswith("\\\"):
            text = text[3:-3].strip()
        return {"markdown": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
'''

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text.strip() + '\n\n' + code.strip() + '\n')

print("DONE")
