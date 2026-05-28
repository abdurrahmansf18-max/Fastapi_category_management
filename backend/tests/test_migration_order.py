import run_migration


def test_run_migration_executes_alembic_before_tenant_migrations(monkeypatch):
    calls: list[str] = []

    def fake_upgrade_head() -> None:
        calls.append("alembic_upgrade")

    async def fake_platform_migrations() -> None:
        calls.append("platform_migrations")

    async def fake_tenant_migrations() -> None:
        calls.append("tenant_migrations")

    monkeypatch.setattr(run_migration, "run_alembic_upgrade_head", fake_upgrade_head)
    monkeypatch.setattr(run_migration, "run_platform_migrations", fake_platform_migrations)
    monkeypatch.setattr(run_migration, "run_tenant_migrations", fake_tenant_migrations)

    run_migration.main()

    assert calls == ["alembic_upgrade", "platform_migrations", "tenant_migrations"]
