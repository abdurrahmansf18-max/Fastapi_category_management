import sys

try:
    with open('src/i18n.ts', 'r', encoding='utf-8') as f: text = f.read()

    en_adds = '''
      select_a_category: 'Select a category',
      choose_category_desc: 'Choose a category from the navigation to get started',
      select_a_topic: 'Select a topic',
      choose_topic_desc: 'Choose a topic from the navigation to view content',
      select_a_subtopic: 'Select a subtopic',
      choose_subtopic_desc: 'Choose a subtopic from the navigation to view content','''

    tr_adds = '''
      select_a_category: 'Bir kategori seçin',
      choose_category_desc: 'Baþlamak için navigasyondan bir kategori seçin',
      select_a_topic: 'Bir konu seçin',
      choose_topic_desc: 'Ýçeriði görmek için navigasyondan bir konu seçin',
      select_a_subtopic: 'Bir alt baþlýk seçin',
      choose_subtopic_desc: 'Ýçeriði görmek için navigasyondan bir alt baþlýk seçin','''

    ar_adds = '''
      select_a_category: '???? ???',
      choose_category_desc: '???? ??? ?? ???? ?????? ?????',
      select_a_topic: '???? ??????',
      choose_topic_desc: '???? ?????? ?? ???? ?????? ???? ???????',
      select_a_subtopic: '???? ?????? ?????',
      choose_subtopic_desc: '???? ?????? ????? ?? ???? ?????? ???? ???????','''

    text = text.replace(\"table_of_contents: 'TABLE OF CONTENTS',\", f\"table_of_contents: 'TABLE OF CONTENTS',{en_adds}\")
    text = text.replace(\"table_of_contents: 'ÝÇÝNDEKÝLER',\", f\"table_of_contents: 'ÝÇÝNDEKÝLER',{tr_adds}\")
    text = text.replace(\"table_of_contents: '???? ?????????',\", f\"table_of_contents: '???? ?????????',{ar_adds}\")

    with open('src/i18n.ts', 'w', encoding='utf-8') as f: f.write(text)
    print('i18n updated successfully')
except Exception as e:
    print('error', e)
