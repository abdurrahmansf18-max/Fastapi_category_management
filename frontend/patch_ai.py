import os
import re

with open('src/admin/components/CreateContentForm.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure AI is imported
if 'import { ContentImagesApi, AI }' not in text:
    text = text.replace('import { ContentImagesApi }', 'import { ContentImagesApi, AI }')

# Add AI loading state
if 'const [isAiFormatting, setIsAiFormatting] = useState(false);' not in text:
    text = text.replace('const [isSubmitting, setIsSubmitting] = useState(false);', 'const [isSubmitting, setIsSubmitting] = useState(false);\n  const [isAiFormatting, setIsAiFormatting] = useState(false);')

# Find autoFormatMarkdown
auto_fmt_start = text.find('const autoFormatMarkdown = () => {')
if auto_fmt_start != -1:
    # replace the entire function
    auto_fmt_end = text.find('  const insertImagePlaceholder = () => {', auto_fmt_start)
    
    new_func = """const autoFormatMarkdown = async () => {
    if (!body.trim()) return;
    setIsAiFormatting(true);
    try {
      const response = await AI.formatMarkdown(body);
      setBody(response.data.markdown);
    } catch (error) {
      console.error("AI Error:", error);
      alert("Yapay zeka formatter hatası. Lütfen konsolu kontrol edin.");
    } finally {
      setIsAiFormatting(false);
    }
  };

"""
    text = text[:auto_fmt_start] + new_func + text[auto_fmt_end:]

# Fix button
btn_old = """onClick={autoFormatMarkdown}
                  className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-medium"
                >
                  🪄 {t("convert_to_markdown")}
                </button>"""

btn_new = """onClick={autoFormatMarkdown}
                  disabled={isAiFormatting}
                  className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-medium disabled:opacity-50"
                >
                  {isAiFormatting ? "⏳ " + t("ai_formatting") : "🪄 " + t("convert_to_markdown")}
                </button>"""

text = text.replace(btn_old, btn_new)

with open('src/admin/components/CreateContentForm.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("CreateContentForm patched")
