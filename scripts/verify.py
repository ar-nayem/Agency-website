import urllib.request, json

TOKEN = open('/tmp/admin_token.txt').read().strip()
req = urllib.request.Request(
    'http://localhost:7100/api/students/def7d0f3-ab7b-41a7-b3ed-4d3611e54717',
    headers={'Cookie': 'next-auth.session-token=' + TOKEN}
)
data = json.loads(urllib.request.urlopen(req).read())
print('Name:', data['fullName'])
print('Documents:', len(data['documents']))
for doc in data['documents']:
    print(f'  - {doc["originalName"]} ({doc["category"]})')
