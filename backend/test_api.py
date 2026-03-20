import sys
import json
import urllib.request

req = urllib.request.Request(
    'http://127.0.0.1:8000/admin/format-markdown',
    data=json.dumps({'text': '- test'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print(e)
