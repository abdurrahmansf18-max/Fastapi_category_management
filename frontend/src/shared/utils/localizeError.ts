/**
 * Maps known backend error messages to i18n translation keys.
 * Prevents raw English API errors from showing to Turkish/Arabic users.
 */
export function localizeBackendError(
  message: string | null | undefined,
  t: (key: string) => string
): string {
  if (!message) return t("error");
  const lower = message.toLowerCase();

  // Plan limits (403)
  if (lower.includes("limit reached") || lower.includes("limit for this plan")) {
    return t("plan_limit_reached");
  }
  // Heading already has content (409)
  if (lower.includes("already has content")) {
    return t("heading_already_has_content");
  }
  // Redirect path validation (422)
  if (lower.includes("source and target") || lower.includes("cannot be the same")) {
    return t("redirect_src_dst_same");
  }
  if (lower.includes("unsupported redirect") || lower.includes("redirect status code")) {
    return t("redirect_code_unsupported");
  }
  // Auth errors (400/403)
  if (lower.includes("incorrect email") || lower.includes("incorrect password") || lower.includes("wrong password")) {
    return t("incorrect_credentials");
  }
  if (lower.includes("only the owner")) {
    return t("only_owner_can_manage");
  }
  // Duplicate entity (409)
  if (lower.includes("category already exists") || lower.includes("already exists")) {
    // Use specific key if category, else generic
    if (lower.includes("category")) return t("category_exists");
    if (lower.includes("email")) return t("admin_email_exists");
    return t("category_exists"); // fallback generic
  }
  // Content body validation (422)
  if (lower.includes("content body must be") || lower.includes("at least") && lower.includes("characters")) {
    return t("content_min_length");
  }
  // DB trigger errors (may come in Turkish from PostgreSQL)
  if (
    lower.includes("l1 heading") ||
    lower.includes("alt başlık içerirken") ||
    lower.includes("h1 başlık")
  ) {
    return t("h1_has_content");
  }

  // Unknown error: return as-is (better than hiding it)
  return message;
}
