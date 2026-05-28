const ARABIC_SLUG_MAP: Record<string, string> = {
  "ء": "a",
  "آ": "a",
  "أ": "a",
  "إ": "i",
  "ا": "a",
  "ٱ": "a",
  "ب": "b",
  "ت": "t",
  "ث": "th",
  "ج": "j",
  "ح": "h",
  "خ": "kh",
  "د": "d",
  "ذ": "dh",
  "ر": "r",
  "ز": "z",
  "س": "s",
  "ش": "sh",
  "ص": "s",
  "ض": "d",
  "ط": "t",
  "ظ": "z",
  "ع": "a",
  "غ": "gh",
  "ف": "f",
  "ق": "q",
  "ك": "k",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "ه": "h",
  "ة": "h",
  "و": "w",
  "ؤ": "w",
  "ي": "y",
  "ئ": "y",
  "ى": "a",
  "ـ": "",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function transliterateArabic(value: string) {
  return Array.from(value, (char) => ARABIC_SLUG_MAP[char] ?? char).join("");
}

export function slugify(value: string, maxLength = 63) {
  const slug = transliterateArabic(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug.slice(0, maxLength).replace(/-+$/g, "");
}
