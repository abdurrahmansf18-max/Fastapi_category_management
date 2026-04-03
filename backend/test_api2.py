import requests

def main():
    # Login
    res = requests.post('http://localhost:8000/admin/login', data={'username': 'abdo@gmail.com', 'password': 'password'}) # assuming 'password' is password or '12345678'
    print("Login:", res.status_code, res.text)
    if res.status_code == 200:
        token = res.json()['access_token']
        # Get me
        r2 = requests.get('http://localhost:8000/admin/me', headers={'Authorization': f'Bearer {token}'})
        print("Me:", r2.status_code, r2.text)
        
        # Get users
        r3 = requests.get('http://localhost:8000/admin/users', headers={'Authorization': f'Bearer {token}'})
        print("Users:", r3.status_code, r3.text)

if __name__ == '__main__':
    main()