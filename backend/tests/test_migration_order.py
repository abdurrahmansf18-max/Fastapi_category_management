import asyncio

import run_migration


def test_run_migration_executes_alembic_before_tenant_migrations(monkeypatch):
    calls: list[str] = []

    def fake_upgrade_head() -> None:
        calls.append("alembic_upgrade")

    async def fake_tenant_migrations() -> None:
        calls.append("tenant_migrations")

    monkeypatch.setattr(run_migration, "run_alembic_upgrade_head", fake_upgrade_head)
    monkeypatch.setattr(run_migration, "run_tenant_migrations", fake_tenant_migrations)

    asyncio.run(run_migration.main())

    assert calls == ["alembic_upgrade", "tenant_migrations"]
