import re

path = 'src/app/(tabs)/zdecouverte.tsx'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

for i, l in enumerate(lines[75:85], start=76):
    print(f"{i}: {l}")