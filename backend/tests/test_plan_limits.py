from app.db.provisioning import FREE_PLAN_LIMITS


def test_free_plan_is_intentionally_restrictive():
    assert FREE_PLAN_LIMITS["max_admins"] == 2
    assert FREE_PLAN_LIMITS["max_categories"] == 20
    assert FREE_PLAN_LIMITS["max_headings"] == 800
    assert FREE_PLAN_LIMITS["max_contents"] == 800
    assert FREE_PLAN_LIMITS["max_upload_bytes"] == 50 * 1024 * 1024
    assert FREE_PLAN_LIMITS["max_seo_pages"] == 800
    assert FREE_PLAN_LIMITS["ai_monthly_limit"] == 0


def test_free_plan_has_all_required_keys():
    required = (
        "max_admins",
        "max_categories",
        "max_headings",
        "max_contents",
        "max_upload_bytes",
        "max_seo_pages",
        "public_rate_limit",
        "search_rate_limit",
        "admin_rate_limit",
        "ai_monthly_limit",
    )
    for key in required:
        assert key in FREE_PLAN_LIMITS, f"Missing key: {key}"
