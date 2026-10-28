import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const mapFile=path.join(root,'asset-map.json');
const map=fs.existsSync(mapFile)?JSON.parse(fs.readFileSync(mapFile,'utf8')):{};
const dirs=['category','journal','journal-category','legal','product','utlity','css'];
const inputs=[...fs.readdirSync(root).filter(n=>n.endsWith('.html')).map(n=>path.join(root,n))];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(/\.(html|css)$/.test(p))inputs.push(p)}}
for(const dir of dirs)if(fs.existsSync(path.join(root,dir)))walk(path.join(root,dir));
const pattern=/https:\/\/(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb\.cloudfront\.net)\/[^\s"'<>\x60)]+/g;
const urls=[...new Set(inputs.flatMap(file=>fs.readFileSync(file,'utf8').match(pattern)||[]))];
const missing=urls.filter(url=>!map[url]||!fs.existsSync(path.join(root,map[url])));
if(missing.length&&process.argv.includes('--apply'))throw new Error('Missing '+missing.length+' downloaded assets; run npm run prepare-media');
if(missing.length){
 fs.mkdirSync(path.join(root,'assets','imported'),{recursive:true});
 let cursor=0;await Promise.all(Array.from({length:6},async()=>{while(cursor<missing.length){const url=missing[cursor++];const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(r.status+' '+url);const base=decodeURIComponent(new URL(url).pathname.split('/').at(-1)).replace(/[^a-zA-Z0-9._-]/g,'_');const rel='assets/imported/'+createHash('sha256').update(url).digest('hex').slice(0,12)+'-'+base;const bytes=Buffer.from(await r.arrayBuffer());if(!bytes.length)throw new Error('Empty asset: '+url);fs.writeFileSync(path.join(root,rel),bytes);map[url]=rel}}));
 fs.writeFileSync(mapFile,JSON.stringify(Object.fromEntries(Object.entries(map).sort()),null,2)+'\n');
}
for(const file of inputs){let text=fs.readFileSync(file,'utf8');text=text.replace(pattern,url=>{const rel=map[url];if(!rel)throw new Error('Unmapped asset: '+url);return path.relative(path.dirname(file),path.join(root,rel)).split(path.sep).join('/')});fs.writeFileSync(file,text)}
console.log('Local assets: '+Object.keys(map).length+'; updated '+inputs.length+' HTML/CSS files.');

