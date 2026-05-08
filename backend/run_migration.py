import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.provisioning import run_platform_migrations


if __name__ == "__main__":
    asyncio.run(run_platform_migrations())
