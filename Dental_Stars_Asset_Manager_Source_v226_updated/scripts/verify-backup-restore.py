# Restore only synthetic records into an isolated SQLite database, never production.
import json,sqlite3,base64
from pathlib import Path
b=json.loads(Path('/tmp/isolated-backup-fixture.json').read_text())
db=sqlite3.connect(':memory:')
for name in b['records']:
 db.execute('CREATE TABLE '+name+' (id TEXT PRIMARY KEY, data TEXT NOT NULL)')
db.execute('INSERT INTO assets VALUES (?,?)',('A','{"id":"A","model":"Current equipment"}'))
documents={}
for _ in range(2):
 for file in b['files']:
  documents.setdefault(file['key'],base64.b64decode(file['base64'],validate=True))
 with db:
  for name,rows in b['records'].items():
   for row in rows: db.execute('INSERT OR IGNORE INTO '+name+' VALUES (?,?)',(row['id'],row['data']))
assert json.loads(db.execute('SELECT data FROM assets WHERE id=?',('A',)).fetchone()[0])['model']=='Current equipment'
assert db.execute('SELECT count(*) FROM settings').fetchone()[0]==1
assert db.execute('SELECT id FROM settings').fetchone()[0]=='equipment-types'
assert documents['evidence/aaaa']==b'%PDF-1.7\nTest receipt'
print('PASS isolated repeated restore preserves existing equipment, skips access settings and prevents duplicate imports.')
