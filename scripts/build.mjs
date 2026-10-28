import fs from 'node:fs';
import path from 'node:path';
import {parse,render,all,one,tag,has,text,html,attr,clone,remove,escape as esc} from './html.mjs';
const root=path.resolve(import.meta.dirname,'..');
const source=name=>parse(fs.readFileSync(path.join(root,'source-export',name),'utf8'));
function csv(name) {
  const source=fs.readFileSync(path.join(root,'data',name),'utf8').replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<source.length;i++) {const c=source[i];
    if(quoted){if(c==='"'&&source[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
    else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;
  }
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const [headers,...items]=rows;return items.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
const active=r=>r.Archived!=='true'&&r.Draft!=='true';
const collections=csv('collections.csv').filter(active),categories=csv('journal-categories.csv').filter(active);
const journals=csv('journals.csv').filter(active).sort((a,b)=>new Date(b['Published On'])-new Date(a['Published On'])||new Date(b['Created On'])-new Date(a['Created On']));
const rows=csv('products.csv').filter(r=>r['Product Handle']);
const price=v=>Number(v['Variant Price'].replace(/[^\d.]/g,''));
const products=[...Map.groupBy(rows,r=>r['Product Handle']).values()].map(variants=>({...variants[0],variants,default:variants.reduce((a,b)=>price(a)<price(b)?a:b)})).sort((a,b)=>new Date(b['Created On'])-new Date(a['Created On']));
const details=JSON.parse(fs.readFileSync(path.join(root,'data','product-details.json'),'utf8'));
const categoryName=slug=>categories.find(c=>c.Slug===slug)?.Name||slug;
const money=v=>`$\u00a0${price(v).toFixed(2)}\u00a0USD`;
const linkProduct=p=>`product/${p['Product Handle']}.html`,linkCollection=c=>`category/${c.Slug}.html`,linkJournal=a=>`journal/${a.Slug}.html`;
const productCollections=p=>collections.filter(c=>p['Product Categories'].split(/\s*;\s*/).includes(c.Name));
function image(node,url,alt=''){attr(node,'src',url);attr(node,'alt',alt);}
function repeat(doc,listClass,data,fill){
  const list=one(doc,listClass);if(!list)return;
  const template=list.children.find(n=>has(n,'w-dyn-item'));if(!template)throw new Error(`No repeat template: ${listClass}`);
  list.children=data.map((entry,i)=>{const n=clone(template);fill(n,entry,i);return n;});
  const parent=one(doc,n=>n.children.includes(list));
  if(data.length)parent.children=parent.children.filter(n=>!has(n,'w-dyn-empty'));
}
function fillProducts(doc,data){
  const list=one(doc,'product-wrapper-masonry')||one(doc,'large-product-grid');if(!list)return;
  repeat(doc,has(list,'product-wrapper-masonry')?'product-wrapper-masonry':'large-product-grid',data,(card,p)=>{
    attr(card,'data-product-name',p['Product Name'].toLowerCase());
    for(const a of all(card,'product-item'))attr(a,'href',linkProduct(p));
    image(one(card,'product-image'),p.default['Main Variant Image'],p['Product Name']);
    if(!p.default['Variant Compare-at Price'])remove(card,'on-sale');
    repeat(card,'product-information-brand-list',productCollections(p),(item,c)=>{attr(tag(item,'a'),'href',linkCollection(c));text(tag(item,'h6'),c.Name);});
    if(!productCollections(p).length)html(one(card,'product-information-brand'),'<div class="w-dyn-empty"><div>No items found.</div></div>');
    const info=one(card,'product-information');info.children=info.children.filter(n=>n.tag!=='h6');
    const blocks=all(card,'product-text');text(blocks[0].children.find(n=>n.tag==='div'),p['Product Name']);
    const prices=blocks[1].children.filter(n=>n.tag==='div');
    if(p.default['Variant Compare-at Price'])text(prices[0],p.default['Variant Compare-at Price']);else remove(blocks[1],n=>n===prices[0]);
    text(prices[1],money(p.default));
  });for(const pagination of all(doc,'w-pagination-wrapper'))pagination.children=[];
}
function fillCollections(doc,data){
  const outer=one(doc,'feature-collection');if(!outer)return;
  repeat(outer,'w-dyn-items',data,(card,c)=>{
    attr(tag(card,'a'),'href',linkCollection(c));image(tag(card,'img'),c['Category Image'],c.Name);
    text(tag(card,'h1'),c.Name);text(one(card,'text-link'),c['CTA Text']);
    attr(one(card,'feature-item-block'),'style',`color:${c['Text Color (over image)']}`);
    attr(one(card,'text-link'),'style',`border-color:${c['Text Color (over image)']}`);
  });
}
function fillJournals(doc,data){repeat(doc,'journal-gird',data,(card,a)=>{
  attr(tag(card,'a'),'href',linkJournal(a));image(tag(card,'img'),a['Thumbnail Image'],a.Name);
  text(tag(card,'h6'),categoryName(a.Category));text(tag(card,'h2'),a.Name);text(tag(card,'p'),a['Short description']);
});}
function fillJournalFilters(doc,current=''){repeat(doc,'journal-filters-list',categories,(item,c)=>{
  attr(tag(item,'a'),'href',`journal-category/${c.Slug}.html`);text(tag(item,'h6'),c.Name);
  if(c.Slug===current){attr(tag(item,'a'),'aria-current','page');tag(item,'a').attrs.class+=' w--current';}
});}
function finalize(doc,rel,title,prefix='',staticNested=false){
  text(tag(doc,'title'),`${title} | Lumora`);
  for(const cart of all(doc,'cart')){
    const button=one(cart,'w-commerce-commercecartopenlink');if(!button)continue;
    button.attrs={class:'w-commerce-commercecartopenlink navigation-link w-inline-block catalogue-bag',role:'button','aria-disabled':'true',title:'Catalogue only — online checkout is unavailable'};
    cart.attrs={class:'w-commerce-commercecartwrapper cart'};cart.children=[button];
  }
  for(const form of all(doc,n=>n.tag==='form'&&has(n,'subscribe-block'))){
    form.tag='div';form.attrs={class:'subscribe-block',role:'group','aria-label':'Newsletter — subscription is currently unavailable'};
    for(const input of all(form,n=>n.tag==='input')){attr(input,'disabled','');attr(input,'title','Newsletter subscription is currently unavailable');}
  }
  for(const node of all(doc,()=>true)){
    if(node.attrs.class&&(node.children.some(n=>n.tag||n.raw?.trim())||node.attrs.src))node.attrs.class=node.attrs.class.replace(/\bw-dyn-bind-empty\b/g,'').trim();
    for(const key of ['src','href','action']){const v=node.attrs[key];if(prefix&&!staticNested&&v&&!/^(?:#|\/|[a-z]+:)/i.test(v))node.attrs[key]=prefix+v;}
    if(prefix&&!staticNested&&node.attrs.srcset)node.attrs.srcset=node.attrs.srcset.split(',').map(s=>s.trim().startsWith('http')?s:prefix+s.trim()).join(', ');
    if(prefix&&!staticNested)for(const child of node.children){if(child.raw?.startsWith('<script'))child.raw=child.raw.replace(/src="(?![a-z]+:|\/)([^"]+)"/gi,(_,url)=>`src="${prefix}${url}"`);}
  }
  tag(doc,'head').children.push(...parse(`<link rel="stylesheet" href="${prefix}css/catalogue.css">`).children);
  tag(doc,'body').children.push(...parse(`<script src="${prefix}js/catalogue.js" defer></script>`).children);
  const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,render(doc));
}
let doc=source('index.html');fillCollections(doc,collections.slice(0,2));fillProducts(doc,products);fillJournals(doc,journals);
// This featured-product selection is empty on the published original.
html(one(doc,'feature-product-container'),'<div class="w-dyn-empty"><div>No items found.</div></div>');finalize(doc,'index.html','Home');
for(const name of ['shop.html','shop-02.html']){
  doc=source(name);fillProducts(doc,products);
  repeat(doc,'laundry-list-wrapper',collections,(item,c)=>{attr(tag(item,'a'),'href',linkCollection(c));text(tag(item,'h6'),c.Name);});
  const form=one(doc,n=>n.tag==='form'&&has(n,'search'));if(form){attr(form,'data-catalogue-search','');attr(form,'action','shop.html');}
  finalize(doc,name,'Shop');
}
doc=source('collections.html');fillCollections(doc,collections);finalize(doc,'collections.html','Collections');
doc=source('journal.html');fillJournalFilters(doc);fillJournals(doc,journals);finalize(doc,'journal.html','Journal');
for(const c of collections){
  doc=source('detail_category.html');const first=one(doc,'first');text(tag(first,'h4'),c.Name);html(one(first,'rich-text'),c['Category Description']);
  fillProducts(doc,products.filter(p=>productCollections(p).includes(c)));finalize(doc,linkCollection(c),c.Name,'../');
}
for(const p of products){
  doc=source('detail_product.html');const grid=one(doc,'product-page-grid'),blocks=all(grid,'block-sticky');
  repeat(grid,'category-list',productCollections(p),(item,c)=>text(tag(item,'h3'),c.Name));
  text(tag(blocks[0],'h1'),p['Product Name']);text(tag(blocks[0],'p'),p['Product Description']);html(one(blocks[0],'rich-text'),details[p['Product Handle']]||'');
  image(one(grid,'product-image-full'),p.default['Main Variant Image'],p['Product Name']);
  repeat(grid,'product-images-list',p.default['More Variant Images'].split(/;\s*/).filter(Boolean),(item,url)=>image(tag(item,'img'),url,p['Product Name']));
  const prices=all(one(blocks[1],'product-text'),n=>n.tag==='p');text(prices[1],money(p.default));attr(prices[1],'data-variant-price','');
  if(p.default['Variant Compare-at Price'])text(prices[0],p.default['Variant Compare-at Price']);else remove(blocks[1],n=>n===prices[0]);
  const variants=[...p.variants].sort((a,b)=>(parseInt(a['Option1 Value'].replace(/\D/g,''))||0)-(parseInt(b['Option1 Value'].replace(/\D/g,''))||0));
  const options=variants.length>1?`<div class="options"><div class="option"><select class="select-field w-select" aria-label="Select size" data-variant-select><option value="">Select size</option>${variants.map(v=>`<option value="${esc(v['Option1 Value'])}" data-price="${esc(money(v))}" data-image="${esc(v['Main Variant Image'])}">${esc(v['Option1 Value'])}</option>`).join('')}</select></div></div>`:'';
  html(one(blocks[1],'add-to-cart'),`<div class="default-state">${options}<button type="button" class="w-commerce-commerceaddtocartbutton add-to-cart-button catalogue-only" disabled title="Online ordering is not available">Catalogue only</button></div>`);
  finalize(doc,linkProduct(p),p['Product Name'],'../');
}
for(const a of journals){
  doc=source('detail_journal.html');const title=one(doc,'journal-title');
  text(tag(title,'h6'),new Date(a['Updated On']).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'Australia/Sydney'}));
  text(tag(title,'h1'),a.Name);const cat=one(title,'journal-caterogies');text(tag(cat,'h6'),categoryName(a.Category));attr(tag(cat,'a'),'href',`journal-category/${a.Category}.html`);
  image(one(doc,'journal-article-image'),a['Thumbnail Image'],a.Name);html(one(doc,n=>has(n,'rich-text')&&has(n,'centre')),a['Article Content']);
  fillJournals(doc,journals.filter(j=>j.Category===a.Category));finalize(doc,linkJournal(a),a.Name,'../');
}
for(const c of categories){doc=source('detail_journal-categories.html');fillJournalFilters(doc,c.Slug);fillJournals(doc,journals.filter(a=>a.Category===c.Slug));finalize(doc,`journal-category/${c.Slug}.html`,c.Name,'../');}
for(const rel of ['about.html',...fs.readdirSync(path.join(root,'source-export','legal')).filter(n=>n.endsWith('.html')).map(n=>`legal/${n}`)]){
  doc=source(rel);const title=render(tag(doc,'title')).replace(/<[^>]+>/g,'');finalize(doc,rel,title||'Lumora',rel.includes('/')?'../':'',true);
}
for(const name of ['checkout','paypal-checkout','order-confirmation','log-in','sign-up','reset-password','update-password','access-denied','user-account','detail_product','detail_sku','detail_category','detail_journal','detail_journal-categories','search']){
  doc=source('detail_category.html');const first=one(doc,'first');text(tag(first,'h4'),'Catalogue only');
  html(one(first,'rich-text'),'<p>Online checkout and customer accounts are not available on this site yet.</p><p><a href="shop.html">Browse candles</a></p>');
  remove(doc,n=>n.tag==='section'&&Boolean(one(n,'product-wrapper')));finalize(doc,`${name}.html`,'Catalogue only');
}
console.log(`Restored Webflow design: ${products.length} products, ${collections.length} collections, ${journals.length} articles, ${categories.length} journal categories.`);
