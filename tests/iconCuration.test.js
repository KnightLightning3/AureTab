import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const load=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const selection=load('data/icon-selection.json'),index=load('data/icon-variants.json'),sites=load('data/sites.json').sites;
test('each whitelisted product has one canonical main and at most one genuinely wide mark',()=>{
 const domains=new Set(load('data/icon-whitelist.json').sites.map(s=>s.domain));
 assert.equal(selection.sites.length,domains.size);
 const files=new Set(),hashes=new Map();
 for(const s of selection.sites){
  assert.ok(domains.has(s.domain));
  for(const role of ['main','wide'])assert.ok(s.icons.filter(i=>i.role===role).length<=1);
  for(const i of s.icons){
   assert.equal(i.file.includes('/'),false);files.add(i.file);
   const bytes=readFileSync(new URL('../assets/site-icons/'+i.file,import.meta.url));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),i.sha256);
   if(hashes.has(i.sha256))assert.equal(hashes.get(i.sha256),i.file,'identical bytes must share a file');
   hashes.set(i.sha256,i.file);
   if(i.role==='wide'){assert.ok(i.aspect>=1.8,s.domain);assert.ok(i.inkAspect>=1.6,s.domain)}
  }
  const catalog=sites.find(x=>x.domain===s.domain);
  assert.equal(catalog.icon,s.icons.find(i=>i.role==='main')?.file);
  assert.equal(catalog.iconWide,s.icons.find(i=>i.role==='wide')?.file);
 }
 const actual=readdirSync(new URL('../assets/site-icons/',import.meta.url)).filter(f=>/\.(svg|png|jpe?g|ico|webp)$/i.test(f));
 assert.deepEqual(new Set(actual),files);
 assert.equal(files.size,selection.stats.packagedFiles);
});
test('runtime picker references packaged files only; uncommon brands are absent',()=>{
 for(const items of Object.values(index.brands)){
  assert.ok(items.length<=2);
  assert.equal(items.length,new Set(items.map(x=>x.file)).size);
  for(const i of items){assert.equal(i.file.includes('/'),false);assert.ok(existsSync(new URL('../assets/site-icons/'+i.file,import.meta.url)))}
 }
 assert.equal(Object.hasOwn(index.domains,'7-zip.org'),false);
 for(const s of selection.sites.filter(s=>s.status==='missing-exact-product'))assert.equal(s.icons.length,0);
 assert.ok(existsSync(new URL('../assets/site-icons/licenses/lobe-icons/LICENSE',import.meta.url)));
 assert.ok(existsSync(new URL('../assets/site-icons/licenses/dashboard-icons/LICENSE',import.meta.url)));
 assert.ok(existsSync(new URL('../assets/site-icons/licenses/simple-icons/DISCLAIMER.md',import.meta.url)));
});
