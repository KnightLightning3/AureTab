"""Create a reproducible extension ZIP containing runtime files and legal notices only."""
from pathlib import Path
import argparse,zipfile,re,json
ROOT=Path(__file__).resolve().parents[1]
SOURCE_LIBRARIES={'lobe-icons','dashboard-icons','simple-icons'}
def runtime_files():
 files=[ROOT/'manifest.json',ROOT/'newtab.html',ROOT/'data/sites.json',ROOT/'data/icon-variants.json']
 for name in ['css','js','assets/brand','assets/site-icons','assets/wallpapers']:
  files.extend(p for p in (ROOT/name).rglob('*') if p.is_file() and p.name!='.DS_Store' and '__pycache__' not in p.parts)
 files.extend(p for p in (ROOT/'assets/icons').rglob('*') if p.is_file() and p.name!='.DS_Store' and not any(name in p.relative_to(ROOT/'assets/icons').parts for name in SOURCE_LIBRARIES))
 return sorted(set(files))
def package(output):
 files=runtime_files();names={p.relative_to(ROOT).as_posix() for p in files}
 manifest=json.loads((ROOT/'manifest.json').read_text())
 for icon in manifest.get('icons',{}).values():
  if icon not in names:raise ValueError('Missing extension icon '+icon)
 for p in files:
  if p.suffix=='.js':
   for spec in re.findall(r'(?:from\s*|import\s*\()\s*[\'"]([^\'"]+)',p.read_text()):
    if spec.startswith('.'):
     target=(p.parent/spec).resolve().relative_to(ROOT).as_posix()
     if target not in names:raise ValueError('Missing module '+target)
 data=json.loads((ROOT/'data/sites.json').read_text())
 for s in data['sites']:
  for key in ['icon','iconWide']:
   if s.get(key) and 'assets/site-icons/'+s[key] not in names:raise ValueError('Missing packaged icon '+s[key])
 output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in files:
   info=zipfile.ZipInfo(p.relative_to(ROOT).as_posix(),date_time=(2026,10,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,p.read_bytes())
 print(json.dumps({'output':str(output),'files':len(files),'zipBytes':output.stat().st_size,'rawLibrariesIncluded':False}))
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',default='/tmp/auretab.zip');args=parser.parse_args();package(args.output)
