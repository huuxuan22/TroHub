import json
import uuid
import os
from urllib.request import Request, urlopen

def post(url, data):
    req = Request(url, data=json.dumps(data).encode(), headers={'Content-Type':'application/json'})
    resp = urlopen(req)
    return resp.status, resp.read().decode()

if __name__ == '__main__':
    base_url = os.getenv('API_BASE_URL', 'http://127.0.0.1:8000')
    email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"

    try:
        status, body = post(
            f'{base_url}/trohub/auth/register',
            {'full_name': 'Test User', 'email': email, 'phone_number': '0900000000', 'password': 'secret123'},
        )
        print('REGISTER', status)
        print(body)
    except Exception as e:
        print('REGISTER ERR', e)

    try:
        status, body = post(f'{base_url}/trohub/auth/login', {'email': email, 'password': 'secret123'})
        print('LOGIN', status)
        print(body)
    except Exception as e:
        print('LOGIN ERR', e)
