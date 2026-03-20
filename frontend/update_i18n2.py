import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    text = f.read()

en_adds = '''
      select_a_category: 'Select a category',
      choose_category_desc: 'Choose a category from the navigation to get started',
      select_a_topic: 'Select a topic',
      choose_topic_desc: 'Choose a topic from the navigation to view content',
      select_a_subtopic: 'Select a subtopic',
      choose_subtopic_desc: 'Choose a subtopic from the navigation to view content',
      '''
tr_adds = '''
      select_a_category: 'Bir kategori seçin',
      choose_category_desc: 'Baþlamak için navigasyondan bir kategori seçin',
      select_a_topic: 'Bir konu seçin',
      choose_topic_desc: 'Ýçeriði görmek için navigasyondan bir konu seçin',
      select_a_subtopic: 'Bir alt baþlýk seçin',
      choose_subtopic_desc: 'Ýçeriði görmek için navigasyondan bir alt baþlýk seçin',
      '''

ar_adds = '''
      select_a_category: '???? ???',
      choose_category_desc: '???? ??? ?? ???? ?????? ?????',
      select_a_topic: '???? ??????',
      choose_topic_desc: '???? ?????? ?? ???? ?????? ???? ???????',
      select_a_subtopic: '???? ?????? ?????',
      choose_subtopic_desc: '???? ?????? ????? ?? ???? ?????? ???? ???????',
      '''

text = re.sub(r\"(admin_button:\s*'Admin',)\", lambda m: en_adds + m.group(1), text, count=1)
text = re.sub(r\"(admin_button:\s*'Admin',)\", lambda m: tr_adds + m.group(1), text, count=1)
text = re.sub(r\"(admin_button:\s*'[^']+',)\", lambda m: ar_adds + m.group(1), text, count=1)

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done')
