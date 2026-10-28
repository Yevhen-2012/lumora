import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const names=[...fs.readdirSync(root).filter(n=>n.endsWith('.html')),'.nojekyll','assets','category','css','fonts','images','journal','journal-category','js','legal','product','utlity'];
for(const name of names){const from=path.join(root,name);if(fs.existsSync(from))fs.cpSync(from,path.join(out,name),{recursive:true})}
console.log('Packaged static site in dist/');

