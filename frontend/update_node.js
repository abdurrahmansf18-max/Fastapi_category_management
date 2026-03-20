const fs = require('fs');

let text = fs.readFileSync('src/i18n.ts', 'utf8');

const enAdds = "
      select_a_category: 'Select a category',
      choose_category_desc: 'Choose a category from the navigation to get started',
      select_a_topic: 'Select a topic',
      choose_topic_desc: 'Choose a topic from the navigation to view content',
      select_a_subtopic: 'Select a subtopic',
      choose_subtopic_desc: 'Choose a subtopic from the navigation to view content',
";

const trAdds = "
      select_a_category: 'Bir kategori seçin',
      choose_category_desc: 'Başlamak için navigasyondan bir kategori seçin',
      select_a_topic: 'Bir konu seçin',
      choose_topic_desc: 'İçeriği görmek için navigasyondan bir konu seçin',
      select_a_subtopic: 'Bir alt başlık seçin',
      choose_subtopic_desc: 'İçeriği görmek için navigasyondan bir alt başlık seçin',
";

const arAdds = "
      select_a_category: 'اختر فئة',
      choose_category_desc: 'اختر فئة من شريط التنقل للبدء',
      select_a_topic: 'اختر موضوعا',
      choose_topic_desc: 'اختر موضوعا من شريط التنقل لعرض المحتوى',
      select_a_subtopic: 'اختر موضوعا فرعيا',
      choose_subtopic_desc: 'اختر موضوعا فرعيا من شريط التنقل لعرض المحتوى',
";

let parts = text.split(/admin_button:\s*'[^']+',/);

if (parts.length === 4) {
    text = parts[0] + enAdds + "admin_button: 'Admin'," + parts[1] + trAdds + "admin_button: 'Admin'," + parts[2] + arAdds + "admin_button: 'المسؤول'," + parts[3];
    fs.writeFileSync('src/i18n.ts', text, 'utf8');
    console.log('Success');
} else {
    console.log('Split failed. Found parts:', parts.length);
}
