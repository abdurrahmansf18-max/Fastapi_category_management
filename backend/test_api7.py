import asyncio
from httpx import AsyncClient, ASGITransport
import traceback

async def test_app():
    from main import app
    from app.db.session import fetch_one
    from app.core.security import create_access_token
    import uuid

    res = await fetch_one('SELECT id, email FROM admin_user LIMIT 1')
    if not res:
        print("no admin users")
        return
    token = create_access_token({'uid': str(res['id']), 'sub': res['email']})
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        try:
            r = await ac.get("/admin/me", headers={"Authorization": f"Bearer {token}"})
            print(r.status_code, r.text)
        except Exception as e:
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_app())