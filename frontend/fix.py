import sys

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # remove the hook from 'toUndef'
    content = content.replace("const toUndef = (s: string | null | undefined) => {\n  const { t } = useTranslation();", "const toUndef = (s: string | null | undefined) => {")
    content = content.replace("function cx(...c: (string | false | undefined)[]) {\n  const { t } = useTranslation();", "function cx(...c: (string | false | undefined)[]) {")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('src/admin/AdminApp.tsx')
fix_file('src/user/PublicApp.tsx')
