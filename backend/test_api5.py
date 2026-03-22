import asyncio
from app.db.session import fetch_one
from app.core.security import create_access_token
import requests

async def main():
    res = await fetch_one('SELECT id, email FROM admin_user LIMIT 1')
    if not res:
        print("no admin users")
        return
    token = create_access_token({'uid': str(res['id']), 'sub': res['email']})
    print("token:", token)
    
    r3 = requests.get('http://localhost:8000/admin/users', headers={'Authorization': f'Bearer {token}'})
    print("Users:", r3.status_code, r3.text)

if __name__ == '__main__':
    asyncio.run(main())