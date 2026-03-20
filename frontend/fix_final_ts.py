with open('src/admin/AdminApp.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace c.description with h.description in updateHeading
text = text.replace(
    'showPrompt(t("edit_description"), c.description || "", t("description_optional"));\n                                    updateHeading(h.id, {',
    'showPrompt(t("edit_description"), h.description || "", t("description_optional"));\n                                    updateHeading(h.id, {'
)

text = text.replace(
    'showPrompt(t("edit_description"), c.description || "", t("description_optional"));\n                                      updateHeading(h.id, {',
    'showPrompt(t("edit_description"), h.description || "", t("description_optional"));\n                                      updateHeading(h.id, {'
)

text = text.replace(
    ' {c.description && (\n                          <p className="text-sm text-gray-600',
    ' {h.description && (\n                          <p className="text-sm text-gray-600'
)

# Fix for h.description where c.description was incorrectly pushed
text = text.replace(
    '                           {c.description}\n                          </p>\n                        )}\n                      </div>',
    '                           {h.description}\n                          </p>\n                        )}\n                      </div>'
)


with open('src/admin/AdminApp.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done!")
