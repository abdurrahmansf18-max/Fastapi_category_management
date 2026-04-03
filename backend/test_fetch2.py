from app.db.session import fetch_one
import asyncio
import uuid

async def main():
    try:
        res = await fetch_one('SELECT id, email, created_at FROM admin_user LIMIT 1')
        print('db row:', dict(res) if res else None)
        if res:
            res2 = await fetch_one('SELECT id, email, created_at FROM admin_user WHERE id = :id', {'id': res['id']})
            print('res2:', res2)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())