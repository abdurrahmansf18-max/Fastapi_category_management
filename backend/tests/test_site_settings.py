import pytest
from pydantic import ValidationError

from app.db import provisioning
from app.schemas import SiteSettingsUpdate


def test_tenant_schema_seeds_primary_color_setting():
    ddl = "\n".join(provisioning.TENANT_DDL)

    assert "('primary_color', '#10b981')" in ddl


def test_site_settings_primary_color_validation():
    payload = SiteSettingsUpdate(primary_color="#ABCDEF")

    assert payload.primary_color == "#abcdef"

    with pytest.raises(ValidationError):
        SiteSettingsUpdate(primary_color="emerald")
