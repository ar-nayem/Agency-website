import jwt, time

secret = 'glorie-secret-key-2024-change-in-production'

admin_tok = jwt.encode({
    'name': 'Admin',
    'email': 'admin@glorie.com',
    'sub': 'cmcjt6a1q0000ti8r1234567',
    'role': 'ADMIN',
    'iat': int(time.time()),
    'exp': int(time.time()) + 86400,
    'jti': 'test-' + str(int(time.time()))
}, secret, algorithm='HS256')

print('ADMIN_TOKEN=' + admin_tok)

agent_tok = jwt.encode({
    'name': 'Agent Demo',
    'email': 'agent@glorie.com',
    'sub': 'cmcjt6a1q0000ti8r7654321',
    'role': 'AGENT',
    'iat': int(time.time()),
    'exp': int(time.time()) + 86400,
    'jti': 'test-agent-' + str(int(time.time()))
}, secret, algorithm='HS256')

print('AGENT_TOKEN=' + agent_tok)
