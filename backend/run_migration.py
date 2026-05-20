import asyncio
import os
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import validate_production_config
from app.db.provisioning import run_platform_migrations, run_tenant_migrations


def run_alembic_upgrade_head() -> None:
    from alembic import command
    from alembic.config import Config

    repo_root = Path(__file__).resolve().parent
    alembic_ini = repo_root / "alembic.ini"
    cfg = Config(str(alembic_ini))
    cfg.set_main_option("script_location", str(repo_root / "alembic"))
    command.upgrade(cfg, "head")


async def _run_async_migrations() -> None:
    await run_platform_migrations()
    await run_tenant_migrations()


def main() -> None:
    run_alembic_upgrade_head()
    asyncio.run(_run_async_migrations())


if __name__ == "__main__":
    validate_production_config()
    main()
