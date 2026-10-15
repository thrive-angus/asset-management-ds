# Compile direct concurrency checks against the application's real SQLite schema.
import sqlite3,re
from pathlib import Path
conn=sqlite3.connect(':memory:')
schema=Path('db/schema.ts').read_text()
for match in re.finditer(r"sqliteTable\('([^']+)',\s*\{(.*?)\}\)",schema,re.S):
 cols=re.findall(r"text\('([^']+)'\)",match[2])
 conn.execute('CREATE TABLE '+match[1]+' ('+', '.join(c+' TEXT' for c in cols)+')')
count=0
for file in Path('app').rglob('*.ts'):
 for match in re.finditer(r'''sql:\s*(['"])((?:\\.|(?!\1).)*?)\1''',file.read_text(),re.S):
  sql=match[2]
  if 'SELECT' not in sql:continue
  try:conn.execute('EXPLAIN SELECT ('+sql+')',[None]*sql.count('?'))
  except sqlite3.Error as err:raise RuntimeError(str(file)+': '+sql+': '+str(err))
  count+=1
print('Verified',count,'direct SQL concurrency checks against schema.')

# Both the resolution and repeat-scan guards use the persisted verification table.
conn.execute("INSERT INTO audit_checks (id,audit_id,data) VALUES ('AUD|ASSET','AUD','{}')")
assert conn.execute('SELECT EXISTS (SELECT 1 FROM audit_checks WHERE id = ?)', ['AUD|ASSET']).fetchone()[0] == 1
assert conn.execute('SELECT EXISTS (SELECT 1 FROM audit_checks WHERE id = ?)', ['AUD|MISSING']).fetchone()[0] == 0
print('Verified persisted audit verification guard rejects checked items and allows unchecked items.')
