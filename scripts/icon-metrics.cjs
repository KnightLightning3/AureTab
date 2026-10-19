// Render only whitelisted candidates. Set NODE_PATH to an installation of sharp.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
(async()=>{
 const input=JSON.parse(await fs.readFile(process.argv[2],'utf8')),result={};
 for(let start=0;start<input.length;start+=6)await Promise.all(input.slice(start,start+6).map(async file=>{
  try{
   const bytes=await fs.readFile(file);const m=await sharp(bytes,{density:96,limitInputPixels:40000000}).metadata();
   const {data,info}=await sharp(bytes,{density:96,limitInputPixels:40000000}).resize(64,64,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let left=64,top=64,right=-1,bottom=-1;
   for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(data[(y*64+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
   if(right<left)throw Error('empty artwork');
   const norm=await sharp(data,{raw:info}).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(33,32,{fit:'fill'}).ensureAlpha().raw().toBuffer();
   const alpha=[],edges=[];
   const lum=i=>{const a=norm[i+3]/255;return (norm[i]*.2126+norm[i+1]*.7152+norm[i+2]*.0722)*a+255*(1-a)};
   for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*33+x)*4;alpha.push(norm[i+3]>128?'1':'0');edges.push(lum(i)>lum(i+4)?'1':'0')}
   result[file]={sourceSha256:digest(bytes),format:m.format,width:m.width,height:m.height,inkAspect:(right-left+1)/(bottom-top+1),renderHash:digest(data),alphaBits:alpha.join(''),edgeBits:edges.join('')};
  }catch(e){result[file]={error:e.message}}
 }));
 await fs.writeFile(process.argv[3],JSON.stringify(result));console.log('Rendered',Object.keys(result).length,'candidates');
})().catch(e=>{console.error(e);process.exit(1)});
