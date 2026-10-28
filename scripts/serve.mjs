import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2);
const port=Number(args.find(a=>a.startsWith('--port='))?.split('=')[1]||4174);
const base=args.find(a=>a.startsWith('--base='))?.split('=')[1]||'/';
const root=path.resolve(import.meta.dirname,'..',args.includes('--dist')?'dist':'');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff'};
http.createServer((req,res)=>{
 let name;
 try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 if(!name.startsWith(base)){res.writeHead(404).end('Not found');return}
 name=name.slice(base.length);
 if(!name||name.endsWith('/'))name+='index.html';
 if(!path.extname(name))name+='.html';
 const file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data)});
}).listen(port,'127.0.0.1',()=>console.log('Lumora: http://127.0.0.1:'+port+base));

