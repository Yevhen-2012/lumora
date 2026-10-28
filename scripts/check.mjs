import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..','dist'),files=[];
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())walk(p);else files.push(p)}}
walk(root);
const names=new Set(files.map(p=>path.relative(root,p).split(path.sep).join('/')));
const html=files.filter(p=>p.endsWith('.html')),errors=[];let checked=0;
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'");
function check(from,value){value=decode(value).trim();if(!value||/^(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(value))return;
 if(value.startsWith('/')){errors.push(path.relative(root,from)+': root-relative '+value);return}
 let pathname;try{pathname=decodeURIComponent(value.split(/[?#]/)[0])}catch{errors.push('Malformed URL '+value);return}
 if(!pathname)return;const target=path.resolve(path.dirname(from),pathname);let rel=path.relative(root,target).split(path.sep).join('/');if(value.endsWith('/'))rel+='/index.html';
 if(!names.has(rel))errors.push(path.relative(root,from)+': '+value+' → '+rel);checked++}
for(const f of html){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/\b(?:src|href|action)=["']([^"']*)["']/gi))check(f,m[1]);for(const m of t.matchAll(/\bsrcset="([^"]*)"/gi))for(const v of m[1].split(','))check(f,v.trim().split(/\s+/)[0]);if(/https:\/\/(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb\.cloudfront\.net)/.test(t))errors.push(path.relative(root,f)+': Webflow asset URL remains')}
for(const f of files.filter(p=>p.endsWith('.css'))){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/url\(\s*["']?([^"'\s)]+)["']?\s*\)/gi))check(f,m[1])}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Passed: '+html.length+' HTML pages; '+checked+' local links/resources; '+files.length+' publishable files. No root-relative paths or missing files.');

