import os

with open('../backend/app/routers/admin.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add Pydantic model for Markdown formatting after the existing imports
if 'from pydantic import BaseModel' not in code:
    code = code.replace("from fastapi import APIRouter,", "from pydantic import BaseModel\nfrom fastapi import APIRouter,")

# Add the format markdown endpoint
markdown_endpoint = """
class FormatMarkdownRequest(BaseModel):
    text: str

@admin_router.post("/format-markdown")
async def format_markdown(req: FormatMarkdownRequest, current_admin: dict = Depends(get_current_admin)):
    import os
    import google.generativeai as genai
    
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Lütfen .env dosyasına GEMINI_API_KEY ekleyin.")
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = "Sen yetenekli bir içerik editörüsün. Sana vereceğim düz metinleri, başlıklar (##, ###), listeler (-) ve kalın yazılar (**) kullanarak zengin, okunaklı ve profesyonel bir Markdown formatına dönüştür. İçeriğin dilini anla ve o dil kurallarına uygun harika bir yapı oluştur. Sadece Markdown olarak formatlanmış metni döndür, ekstra hiçbir açıklama veya diyalog ekleme.\\n\\nMetin:\\n" + req.text
        response = model.generate_content(prompt)
        
        # Temizle: Eğer yapay zeka ```markdown ile sararsa onu kaldır.
        res_text = response.text.strip()
        if res_text.startswith("```markdown"):
            res_text = res_text[11:]
        if res_text.startswith("```"):
            res_text = res_text[3:]
        if res_text.endswith("```"):
            res_text = res_text[:-3]
            
        return {"markdown": res_text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""

if 'FormatMarkdownRequest' not in code:
    code += "\n" + markdown_endpoint

with open('../backend/app/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Backend patched")
