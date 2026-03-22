import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

en_insert = '''      h1_has_content: "Main heading has content",
      h1_has_content_desc: "You cannot add subheadings to this main heading because it already has content.",
'''
text = re.sub(r'(en:\s*\{\s*translation:\s*\{)', r'\1\n' + en_insert, text)

tr_insert = '''      h1_has_content: "Ana baþlýðýn içeriði var",
      h1_has_content_desc: "Bu ana baþlýða alt baþlýk ekleyemezsiniz çünkü zaten içerik mevcut.",
'''
text = re.sub(r'(tr:\s*\{\s*translation:\s*\{)', r'\1\n' + tr_insert, text)

ar_insert = '''      h1_has_content: "??????? ??????? ????? ??? ?????",
      h1_has_content_desc: "?? ????? ????? ?????? ????? ???? ??????? ??????? ???? ????? ??? ????? ??????.",
'''
text = re.sub(r'(ar:\s*\{\s*translation:\s*\{)', r'\1\n' + ar_insert, text)

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done')
