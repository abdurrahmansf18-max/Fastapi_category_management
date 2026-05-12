import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import validate_production_config
from app.db.provisioning import run_platform_migrations, run_tenant_migrations


async def main():
    await run_platform_migrations()
    await run_tenant_migrations()


if __name__ == "__main__":
    validate_production_config()
    asyncio.run(main())
