import re

with open('src/user/PublicApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'title=\"Select a category\"', 'title={t(\"select_a_category\")}', text)
text = re.sub(r'subtitle=\"Choose a category from the navigation to get started\"', 'subtitle={t(\"choose_category_desc\")}', text)

text = re.sub(r'title=\"Select a topic\"', 'title={t(\"select_a_topic\")}', text)
text = re.sub(r'subtitle=\"Choose a topic from the navigation to view content\"', 'subtitle={t(\"choose_topic_desc\")}', text)

text = re.sub(r'title=\"Select a subtopic\"', 'title={t(\"select_a_subtopic\")}', text)
text = re.sub(r'subtitle=\"Choose a subtopic from the navigation to view content\"', 'subtitle={t(\"choose_subtopic_desc\")}', text)

with open('src/user/PublicApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')
