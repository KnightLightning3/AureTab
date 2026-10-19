"""Offline audit/curation. Raw libraries are inputs, never runtime dependencies.
Usage: python3 scripts/curate-icons.py analyze [--work-dir /tmp/easy-tab-icon-audit]
       python3 scripts/curate-icons.py apply [--work-dir ...]
       python3 scripts/curate-icons.py runtime
"""
from pathlib import Path
import argparse,collections,hashlib,json,re,shutil,subprocess,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def write(p,v):
 p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def inspect(p):
 data=p.read_bytes();r={'source':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 try:
  if p.suffix.lower()=='.svg':
   node=ET.fromstring(data)
   if node.tag.split('}')[-1]!='svg':raise ValueError('Not SVG')
   box=re.split(r'[\s,]+',node.get('viewBox','').strip());w=h=None
   if len(box)==4:w,h=float(box[2]),float(box[3])
   else:
    def size(v):
     m=re.fullmatch(r'([\d.]+)(?:px)?',v or '');return float(m[1]) if m else None
    w,h=size(node.get('width')),size(node.get('height'))
   if not w or not h or w<=0 or h<=0:raise ValueError('SVG has no usable intrinsic ratio')
   if any(n.tag.split('}')[-1] in ['script','foreignObject'] for n in node.iter()):raise ValueError('Active SVG content')
   for n in node.iter():
    if any(k.lower().startswith('on') or (k.split('}')[-1] in ['href'] and not v.startswith(('#','data:image/'))) for k,v in n.attrib.items()):raise ValueError('External/active SVG reference')
   r.update(format='svg',width=w,height=h,aspect=w/h,mono=b'currentColor' in data)
   geometry=[(n.tag.split('}')[-1],sorted((k,v) for k,v in n.attrib.items() if k in ['d','points','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','transform'])) for n in node.iter() if n.tag.split('}')[-1] in ['path','rect','circle','ellipse','polygon','polyline','line']]
   r['geometryHash']=hashlib.sha256(json.dumps(geometry).encode()).hexdigest()
  else:
   from PIL import Image
   with Image.open(p) as image:
    w,h=image.size;r.update(format=image.format.lower(),width=w,height=h,aspect=w/h,mono=False)
 except Exception as e:r['error']=str(e)
 return r

def analyze(work):
 work.mkdir(parents=True,exist_ok=True);inventory=[]
 for directory in ['assets/icons/lobe-icons','assets/icons/dashboard-icons/svg','assets/icons/simple-icons/icons','assets/site-icons']:
  inventory.extend(inspect(p) for p in sorted((ROOT/directory).glob('*')) if p.suffix.lower() in ['.svg','.png','.jpg','.jpeg','.webp','.ico'])
 whitelist=read('data/icon-whitelist.json');by_file={r['source']:r for r in inventory}
 rawbrands=collections.defaultdict(list)
 suffix=re.compile(r'-(?:brand-color|brand|text-color|text-cn|text|wordmark-dark|wordmark-light|wordmark|icon-dark|icon-light|icon|color|dark|light)$')
 for r in inventory:
  if not r['source'].startswith('assets/icons/'):continue
  stem=Path(r['source']).stem
  while suffix.search(stem):stem=suffix.sub('',stem)
  rawbrands[re.sub(r'[^a-z0-9]','',stem.lower())].append(r['source'])
 candidates={}
 for site in whitelist['sites']:
  paths=[]
  for key in site['brandKeys']:
   paths.extend(rawbrands.get(key,[]))
  for key in ['fallback','fallbackWide']:
   if site.get(key):paths.append('assets/site-icons/'+site[key])
  # Subsequent audits use the original selection provenance, too.
  if (ROOT/'data/icon-selection.json').exists():
   for selected in read('data/icon-selection.json')['sites']:
    if selected['domain']==site['domain']:paths.extend(x['source'] for x in selected.get('icons',[]))
  candidates[site['domain']]=list(dict.fromkeys(p for p in paths if p in by_file and 'error' not in by_file[p]))
 (work/'inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n');(work/'candidates.json').write_text(json.dumps(candidates,indent=2)+'\n')
 paths=sorted(set(p for v in candidates.values() for p in v));(work/'render-input.json').write_text(json.dumps([str(ROOT/p) for p in paths]))
 stats={'scanned':len(inventory),'invalid':sum('error' in x for x in inventory),'whitelistedProducts':len(candidates),'candidateFiles':len(paths),'productsWithCandidates':sum(bool(x) for x in candidates.values())}
 (work/'summary.json').write_text(json.dumps(stats,indent=2)+'\n');print(json.dumps(stats))

def runtime():
 selection=read('data/icon-selection.json');brands={};domains={};aliases={};mono=[];wide={}
 for site in selection['sites']:
  key=re.sub(r'[^a-z0-9]','',site['domain']);domains[site['domain']]=[key];items=[]
  for icon in site['icons']:
   file=icon['file'];items.append({'file':file,'label':'经典图标' if icon['role']=='main' else '横版标识','mono':icon['mono']})
   if icon['mono']:mono.append(file)
  brands[key]=list({item['file']:item for item in reversed(items)}.values())
  main=next((x['file'] for x in site['icons'] if x['role']=='main'),None);long=next((x['file'] for x in site['icons'] if x['role']=='wide'),None)
  if main and long:wide[main]=long;wide[long]=long
  aliases.update(site.get('aliases',{}))
 write('data/icon-variants.json',{'schemaVersion':1,'domains':domains,'brands':brands})
 out='// Generated by scripts/curate-icons.py runtime. Raw source libraries are not shipped.\n'
 for name,val in [('CURATED_ALIASES',aliases),('CURATED_MONO_FILES',sorted(set(mono))),('CURATED_WIDE_FILES',wide)]:out+='export const '+name+' = '+json.dumps(val,ensure_ascii=False,separators=(',',':'))+';\n'
 (ROOT/'js/grid/curatedIconMap.js').write_text(out)
 print('Runtime:',sum(len(s['icons']) for s in selection['sites']),'icons;',len(aliases),'legacy aliases')

def apply(work):
 whitelist=read('data/icon-whitelist.json');catalog=read('data/sites.json');inventory={r['source']:r for r in json.loads((work/'inventory.json').read_text())};candidates=json.loads((work/'candidates.json').read_text());metrics=json.loads((work/'metrics.json').read_text()) if (work/'metrics.json').exists() else {}
 reviews={r['domain']:r for f in ['data/icon-review-web.json','data/icon-review-ai.json'] for r in read(f)['recommendations']}
 simple={r['slug']:r for r in read('assets/icons/simple-icons/data/simple-icons.json')}
 oldfiles={s['domain']:[s.get('icon'),s.get('iconWide')] for s in catalog['sites']}
 original_files={p.name for p in (ROOT/'assets/site-icons').iterdir() if p.suffix.lower() in ['.svg','.png','.jpg','.jpeg','.webp','.ico']}
 previous=read('data/icon-selection.json') if (ROOT/'data/icon-selection.json').exists() else None
 selected=[];blobs={};exact_duplicates=collections.defaultdict(list);near=[];rejected=[];source_counts=collections.Counter();used_simple=[];used_dashboard={}
 inspected=set()
 def record(path):
  if not path:return None
  if not (ROOT/path).exists():return None
  if path not in inspected:inventory[path]=inspect(ROOT/path);inspected.add(path)
  return inventory.get(path)
 def usable(path):
  r=record(path)
  if not r or 'error' in r:return False
  if r['format']!='svg' and min(r['width'],r['height'])<32:
   rejected.append({'source':path,'reason':'Raster is below the renderer minimum of 32px; use text fallback'});return False
  m=metrics.get(str(ROOT/path),{})
  # Sharp cannot decode ICO; Pillow above already verifies it.
  if m.get('error') and r['format']!='ico':return False
  if path.startswith('assets/icons/simple-icons/'):
   license=simple.get(Path(path).stem,{}).get('license',{}).get('type','unknown')
   if license not in ['unknown','CC0-1.0','MIT','Apache-2.0','BSD-3-Clause','Unlicense','CC-BY-4.0','CC-BY-3.0','CC-BY-2.5']:
    rejected.append({'source':path,'reason':'Independent license requires separate review: '+license});return False
  return True
 def relation(a,b):
  if a['sha256']==b['sha256']:return 'exact-bytes'
  if a.get('geometryHash') and a.get('geometryHash')==b.get('geometryHash'):return 'same-geometry'
  ma=metrics.get(str(ROOT/a['source']),{});mb=metrics.get(str(ROOT/b['source']),{})
  if ma.get('sourceSha256',a['sha256'])==a['sha256'] and mb.get('sourceSha256',b['sha256'])==b['sha256'] and ma.get('edgeBits') and mb.get('edgeBits') and abs(a['aspect']/b['aspect']-1)<.12:
   distance=lambda key:sum(x!=y for x,y in zip(ma[key],mb[key]))/1024
   if distance('alphaBits')<.025 and distance('edgeBits')<.025:return 'near-shape-review-only'
 for site in whitelist['sites']:
  domain=site['domain'];review=reviews.get(domain);fallback=site.get('fallback');fallback='assets/site-icons/'+fallback if fallback else None
  main=review.get('main') if review else fallback;reason=review.get('reason') if review else 'Existing exact-product favicon; no better verified local replacement.'
  if main and not usable(main):
   rejected.append({'domain':domain,'source':main,'reason':'Candidate failed type/safety/render/license validation'})
   main=fallback if fallback!=main and usable(fallback) else None
  # Preserve a well-resolved classic color favicon over an otherwise monochrome
  # Simple Icons replacement, unless review explicitly identified the old brand as wrong.
  if main and '/simple-icons/' in main and domain not in ['iconify.design','pypi.org'] and usable(fallback):
   old=record(fallback)
   if old['format']!='svg' and min(old['width'],old['height'])>=64 and not any(word in reason for word in ['无法确认','改推荐','形状','立方体','房屋','不匹配']):
    main=fallback;reason+='；保留已有≥64px的经典彩色favicon，避免换成无品牌色的单色轮廓。'
  wide=review.get('wide') if review else None
  if wide and (not usable(wide) or record(wide)['aspect']<whitelist['policy']['wideMinAspect'] or metrics.get(str(ROOT/wide),{}).get('inkAspect',2)<1.6):
   rejected.append({'domain':domain,'source':wide,'reason':'Not a verified horizontal mark (canvas>=1.8, ink>=1.6 required)'});wide=None
  icons=[];aliases={};outputs={}
  for role,path in [('main',main),('wide',wide if main else None)]:
   if not path:continue
   r=record(path);ext=Path(path).suffix.lower();name=domain+('-text' if role=='wide' else '')+ext
   # One byte-identical resource is shared even if used by both sizes/products.
   if r['sha256'] in blobs:name=blobs[r['sha256']]
   else:
    blobs[r['sha256']]=name
    target=ROOT/'assets/site-icons'/name
    if target.resolve()!=(ROOT/path).resolve():shutil.copyfile(ROOT/path,target)
   ismono=r.get('mono',False) or '/simple-icons/' in path
   # Explicit flat black/white vector marks have no intrinsic brand color.
   if r['format']=='svg' and not ismono:
    raw=(ROOT/path).read_text();fills=re.findall(r'(?:fill|stroke)=["\']([^"\']+)["\']',raw)
    colors={c.lower() for c in fills if c not in ['none','transparent','inherit'] and not c.startswith('url(')}
    ismono=bool(colors) and len(colors)==1 and colors.issubset({'#000','#000000','black','#fff','#ffffff','white'})
   icons.append({'role':role,'file':name,'source':path,'sha256':r['sha256'],'format':r['format'],'width':r['width'],'height':r['height'],'aspect':round(r['aspect'],4),'inkAspect':round(metrics.get(str(ROOT/path),{}).get('inkAspect',r['aspect']),4),'bytes':r['bytes'],'mono':ismono})
   outputs[role]=name
   if '/simple-icons/' in path:used_simple.append(simple.get(Path(path).stem,{'slug':Path(path).stem}))
   if '/dashboard-icons/' in path:
    meta=read('assets/icons/dashboard-icons/metadata.json');used_dashboard[Path(path).stem]=meta.get(Path(path).stem,{})
   source_counts['lobe' if '/lobe-icons/' in path else 'dashboard' if '/dashboard-icons/' in path else 'simple' if '/simple-icons/' in path else 'existing-favicon']+=1
  for path in candidates.get(domain,[]):
   r=record(path)
   if not r:continue
   key=path.removeprefix('assets/icons/') if path.startswith('assets/icons/') else Path(path).name
   aliases[key]=outputs.get('wide' if r['aspect']>=1.8 else 'main') or outputs.get('main')
   exact_duplicates[r['sha256']].append(path)
  for key in ['fallback','fallbackWide']:
   if site.get(key):aliases[site[key]]=outputs.get('wide' if key=='fallbackWide' else 'main') or outputs.get('main')
  for icon in icons:
   if icon['source'].startswith('assets/icons/'):aliases[icon['source'].removeprefix('assets/icons/')]=icon['file']
   aliases[icon['file']]=icon['file']
  # Recommendations may discover a correct brand absent from old fuzzy matching.
  # Keep prior alias migration stable across a later tool rerun.
  if previous:
   prior=next((x for x in previous['sites'] if x['domain']==domain),{})
   for key in prior.get('aliases',{}):aliases.setdefault(key,outputs.get('main'))
  paths=candidates.get(domain,[])
  for i,a in enumerate(paths):
   for b in paths[i+1:]:
    ra,rb=record(a),record(b)
    kind=relation(ra,rb) if ra and rb else None
    if kind and kind!='exact-bytes':near.append({'domain':domain,'kind':kind,'a':a,'b':b})
  selected.append({'domain':domain,'name':site['name'],'cat':site['cat'],'reason':reason,'icons':icons,'aliases':aliases,'status':'selected' if main else 'missing-exact-product'})
  entry=next(s for s in catalog['sites'] if s['domain']==domain)
  for k in ['icon','iconWide']:entry.pop(k,None)
  if outputs.get('main'):entry['icon']=outputs['main']
  if outputs.get('wide'):entry['iconWide']=outputs['wide']
 # Copy legal material into the actual distributable, outside ignored libraries.
 legal=ROOT/'assets/site-icons/licenses';legal.mkdir(exist_ok=True)
 for folder,names in {'lobe-icons':['LICENSE'],'dashboard-icons':['LICENSE'],'simple-icons':['LICENSE.md','DISCLAIMER.md']}.items():
  out=legal/folder;out.mkdir(exist_ok=True)
  for name in names:shutil.copyfile(ROOT/'assets/icons'/folder/name,out/name)
  if (ROOT/'assets/icons'/folder/'SOURCE.json').exists():shutil.copyfile(ROOT/'assets/icons'/folder/'SOURCE.json',out/'SOURCE.json')
 write('assets/site-icons/licenses/simple-icons/selected-metadata.json',list({x.get('slug'):x for x in used_simple}.values()))
 write('assets/site-icons/licenses/dashboard-icons/selected-metadata.json',used_dashboard)
 # Delete superseded packaged copies only, never raw libraries or user-uploaded IDB assets.
 keep={x['file'] for s in selected for x in s['icons']};removed=[]
 for file in sorted(original_files-keep):
  (ROOT/'assets/site-icons'/file).unlink();removed.append(file)
 (ROOT/'data/sites.json').write_text('{\n  \"schemaVersion\": 1,\n  \"categories\": [\n'+',\n'.join('    '+json.dumps(x,ensure_ascii=False,separators=(',',':')) for x in catalog['categories'])+'\n  ],\n  \"sites\": [\n'+',\n'.join('    '+json.dumps(x,ensure_ascii=False,separators=(',',':')) for x in catalog['sites'])+'\n  ]\n}\n')
 stats={'whitelist':len(selected),'productsWithMain':sum(bool(s['icons']) for s in selected),'productsWithWide':sum(any(x['role']=='wide' for x in s['icons']) for s in selected),'packagedFiles':len(keep),'packagedBytes':sum((ROOT/'assets/site-icons'/f).stat().st_size for f in keep),'candidateFiles':sum(bool(x) for x in set(p for v in candidates.values() for p in v)),'rawScanned':len(inventory),'invalidSourceFiles':sum('error'in x for x in inventory.values()),'sourceCounts':dict(source_counts),'removedSupersededFiles':sorted(set(removed+[Path(r['source']).name for r in inventory.values() if r['source'].startswith('assets/site-icons/') and Path(r['source']).name not in keep]+[f for f in (previous['stats'].get('removedSupersededFiles',[]) if previous else []) if f not in keep])),'missingExactProducts':[s['domain'] for s in selected if not s['icons']]}
 report={'schemaVersion':1,'policy':whitelist['policy'],'stats':stats,'sites':selected,'duplicateGroups':[sorted(set(v)) for v in exact_duplicates.values() if len(set(v))>1],'shapeComparisons':near,'rejected':rejected}
 write('data/icon-selection.json',report)
 write('assets/site-icons/licenses/selected-icons.json',[{k:s[k] for k in ['domain','name','icons']} for s in selected if s['icons']])
 runtime()
 print(json.dumps(stats,ensure_ascii=False))

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['analyze','apply','runtime']);parser.add_argument('--work-dir',default='/tmp/easy-tab-icon-audit');args=parser.parse_args();work=Path(args.work_dir)
 if args.command=='analyze':analyze(work)
 elif args.command=='runtime':runtime()
 else:apply(work)
