const fs = require('fs');
let t = fs.readFileSync('src/user/PublicApp.tsx', 'utf8');

t = t.replace('title="Select a category"', 'title={t("select_a_category")}');
t = t.replace('subtitle="Choose a category from the navigation to get started"', 'subtitle={t("choose_category_desc")}');

t = t.replace('title="Select a topic"', 'title={t("select_a_topic")}');
t = t.replace('subtitle="Choose a topic from the navigation to view content"', 'subtitle={t("choose_topic_desc")}');

t = t.replace('title="Select a subtopic"', 'title={t("select_a_subtopic")}');
t = t.replace('subtitle="Choose a subtopic from the navigation to view content"', 'subtitle={t("choose_subtopic_desc")}');

fs.writeFileSync('src/user/PublicApp.tsx', t);
console.log('Done mapping components.');
