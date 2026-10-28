// Small, lossless template tree editor. Raw script/style bodies and entities stay intact.
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parse(html) {
  const root = {tag:'#root', attrs:{}, children:[]}, stack = [root];
  const tokens = html.match(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<![^>]*>|<\/?[a-zA-Z][^>]*(?:"[^"]*"[^>]*)*>|[^<]+|</gi) || [];
  for (const token of tokens) {
    const parent = stack.at(-1);
    if (/^<(script|style)\b/i.test(token) || /^<!/.test(token) || !/^<\/?[a-z]/i.test(token)) { parent.children.push({raw:token}); continue; }
    if (token.startsWith('</')) {
      const tag = token.match(/^<\/([^\s>]+)/)[1].toLowerCase();
      const i = stack.findLastIndex(n => n.tag === tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const [, tag, attributes] = token.match(/^<([^\s/>]+)([\s\S]*?)\/?\s*>$/);
    const node = {tag:tag.toLowerCase(), attrs:{}, children:[]};
    for (const match of attributes.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) node.attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
    parent.children.push(node);
    if (!voidTags.has(node.tag) && !token.endsWith('/>')) stack.push(node);
  }
  return root;
}
export function render(node) {
  if ('raw' in node) return node.raw;
  const inside = node.children.map(render).join('');
  if (node.tag === '#root') return inside;
  const attrs = Object.entries(node.attrs).map(([k,v]) => ` ${k}="${v}"`).join('');
  return `<${node.tag}${attrs}>${voidTags.has(node.tag) ? '' : inside + `</${node.tag}>`}`;
}
export const has = (node, cls) => (node.attrs?.class || '').split(/\s+/).includes(cls);
export function all(root, predicate) {
  const test = typeof predicate === 'string' ? n => has(n, predicate) : predicate;
  const result = [];
  const visit = node => { if(node.tag && test(node)) result.push(node); for(const child of node.children || []) visit(child); };
  visit(root); return result;
}
export const one = (root, predicate) => all(root, predicate)[0];
export const tag = (root, name) => one(root, n => n.tag === name);
export const text = (node, value) => { if(node) node.children = [{raw:escape(value)}]; };
export const html = (node, value) => { if(node) node.children = parse(value).children; };
export const attr = (node, name, value) => { if(node) node.attrs[name] = escape(value); };
export const clone = node => structuredClone(node);
export function remove(root, predicate) {
  const test = typeof predicate === 'string' ? n => has(n,predicate) : predicate;
  for (const node of all(root, () => true)) node.children = node.children.filter(child => !test(child));
}
export function replace(root, target, replacement) {
  for (const node of all(root, () => true)) {const i = node.children.indexOf(target); if (i >= 0) {node.children.splice(i, 1, ...replacement); return;}}
}
