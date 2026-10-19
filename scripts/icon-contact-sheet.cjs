// Render a visual QA sheet for chosen main icons. Requires sharp (via NODE_PATH).
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=process.argv[2]||'/tmp/easy-tab-icon-audit';await fs.mkdir(out,{recursive:true});
 const manifest=JSON.parse(await fs.readFile(path.join(root,'data/icon-selection.json'),'utf8'));
 const items=manifest.sites.filter(s=>s.icons.length);const cols=6,perPage=72,w=160,h=116;
 for(let start=0;start<items.length;start+=perPage){
  const overlays=[],batch=items.slice(start,start+perPage);
  for(let i=0;i<batch.length;i++){
   const site=batch[i],icon=site.icons.find(x=>x.role==='main');let file=path.join(root,'assets/site-icons',icon.file);
   if(icon.format==='ico'){const tmp=path.join(out,icon.file+'.png');require('node:child_process').execFileSync('python3',['-c','from PIL import Image;import sys;Image.open(sys.argv[1]).convert("RGBA").save(sys.argv[2])',file,tmp]);file=tmp}
   let input=await fs.readFile(file);if(icon.format==='svg')input=Buffer.from(input.toString().replace(/<svg\b[^>]*>/,tag=>tag.replace(/\s(?:width|height)=["'][^"']*["']/g,'').replace(/>$/,` width="512" height="${512/icon.aspect}">`)));
   const thumb=await sharp(input,{density:72}).resize(64,64,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).png().toBuffer();
   const label=Buffer.from(`<svg width="160" height="36"><text x="80" y="16" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#111">${site.domain}</text><text x="80" y="30" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#667">${icon.format} ${icon.width}x${icon.height}</text></svg>`);
   const left=(i%cols)*w,top=Math.floor(i/cols)*h;overlays.push({input:thumb,left:left+48,top:top+6},{input:label,left,top:top+74});
  }
  const target=path.join(out,'selected-main-'+(Math.floor(start/perPage)+1)+'.png');await sharp({create:{width:cols*w,height:Math.ceil(batch.length/cols)*h,channels:3,background:'#ffffff'}}).composite(overlays).png().toFile(target);console.log(target);
 }
})().catch(e=>{console.error(e);process.exit(1)});
