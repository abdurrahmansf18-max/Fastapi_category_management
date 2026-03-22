import asyncio
from fastapi.testclient import TestClient
from main import app
from app.db.session import fetch_one
from app.core.security import create_access_token
import traceback

async def main():
    res = await fetch_one('SELECT id, email FROM admin_user LIMIT 1')
    if not res:
        print("no admin users")
        return
    token = create_access_token({'uid': str(res['id']), 'sub': res['email']})
    print("token:", token)
    
    with TestClient(app) as client:
        try:
            r = client.get("/admin/me", headers={"Authorization": f"Bearer {token}"})
            print(r.status_code)
            print(r.json() if r.status_code == 200 else r.text)
        except Exception as e:
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())