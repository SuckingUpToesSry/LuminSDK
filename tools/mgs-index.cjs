#!/usr/bin/env node
/* Metadata only: never executes imported JS, downloads games or embeds their code.
   npm install --prefix .tmp/mgs-parser --no-save --package-lock=false acorn
   node tools/mgs-index.cjs --fetch  (requires gh; pins the upstream commit)
   node tools/mgs-index.cjs          (uses .tmp snapshots from a previous fetch)
   --date=YYYY-MM-DD optionally pins the metadata snapshot date
*/
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname,'..'), temp = path.join(root,'.tmp');
const parser = require(path.join(temp,'mgs-parser/node_modules/acorn'));
const repo = 'Onex558/uranium-source-';
const inputs = [
  ['nth.js','nth.js'], ["Noah's tutoring hub.js",'noah.js'],
  ['uraniumwithgn-mathversi.on.html','uranium.html'], ['uraniumforsvg.html','uranium-svg.html']
];
function gh(endpoint) { return JSON.parse(execFileSync('gh',['api',endpoint],{encoding:'utf8',maxBuffer:8*1024*1024})); }
fs.mkdirSync(temp,{recursive:true});
if (process.argv.includes('--fetch')) {
  const sha = gh('repos/'+repo+'/commits/main').sha;
  fs.writeFileSync(path.join(temp,'uranium-sha.txt'),sha+'\n');
  inputs.forEach(([remote,local]) => {
    const response = gh('repos/'+repo+'/contents/'+encodeURIComponent(remote)+'?ref='+sha);
    if (response.encoding !== 'base64') throw Error('Unsupported upstream encoding: '+remote);
    fs.writeFileSync(path.join(temp,local),Buffer.from(response.content,'base64'));
  });
}
const sha = fs.readFileSync(path.join(temp,'uranium-sha.txt'),'utf8').trim();
if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('Missing pinned upstream commit');
function safeURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    url.hash = '';
    return url.href.replace(/@refs\/heads\//g,'@');
  } catch { return ''; }
}
const games = new Map(), counts = {};
inputs.forEach(([remote,local]) => {
  const text = fs.readFileSync(path.join(temp,local),'utf8'); let found = 0;
  // Flat literal metadata objects only; functions, templates and nested expressions are rejected.
  const literals = text.match(/\{[^{}]*\}/g) || [];
  for (const literal of literals) {
    let expression;
    try { expression = parser.parseExpressionAt('('+literal+')',0,{ecmaVersion:'latest'}); } catch { continue; }
    if (expression.type !== 'ObjectExpression') continue;
    const data = {};
    for (const property of expression.properties) {
      if (property.type !== 'Property' || property.computed || property.kind !== 'init' || property.value.type !== 'Literal' || typeof property.value.value !== 'string') continue;
      const key = property.key.name || property.key.value;
      if (['title','name','url','resolvedUrl','image','resolvedCover'].includes(key)) data[key] = property.value.value;
    }
    const title = (data.title || data.name || '').trim(), url = safeURL(data.resolvedUrl || data.url);
    if (!title || title.length > 160 || !url || !/\.html?(?:[?#]|$)/i.test(url)) continue;
    found++;
    if (games.has(url)) { const old = games.get(url); if (!old.metadata.includes(remote)) old.metadata.push(remote); continue; }
    const library = url.includes('NoahsAmazingTutoringHelp/') ? 'Noah’s Hub' : url.includes('bubbls/ugs-singlefile') ? 'UGS' : url.includes('Onex558/uranium-source-') ? 'Uranium / Custom' : 'Outras bibliotecas';
    games.set(url,{id:crypto.createHash('sha256').update(url).digest('hex').slice(0,16),title,url,image:safeURL(data.resolvedCover || data.image),library,metadata:[remote]});
  }
  counts[remote] = found;
});
const ids = ['HVLL6YBBC5','V9KM79NFHC','J4JXSS9W3N','GEMXRNAA6W','HUZSGDFGGP'];
const base = 'https://script.google.com/macros/s/AKfycbw3KzPix7iLtyJFB7eVqm2NCWhRoqSl0G38p7YeJm6KEHlETcuc-8jVnom69pUcwQUk/exec?id=';
const dateFlag = process.argv.find(value => value.startsWith('--date='));
const snapshotDate = dateFlag ? dateFlag.slice(7) : new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate) || new Date(snapshotDate+'T00:00:00Z').toISOString().slice(0,10) !== snapshotDate) throw Error('Invalid snapshot date');
const output = {version:1,generatedAt:snapshotDate,coverage:'partial',
  coverageNote:'Índice das bibliotecas públicas referenciadas pela coleção. Não é uma extração completa dos cinco Apps Scripts. Use Catálogo original para conteúdo dinâmico ou não indexado.',
  sources:ids.map((id,index)=>({id,name:'WebSight · Fonte '+(index+1),url:base+id})),
  provenance:{repo,commit:sha,manifests:counts},games:[...games.values()].sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'))};
if (output.games.length < 100) throw Error('Upstream layout changed; refusing an unexpectedly small index');
const destination = path.join(root,'assets/data/mgs.json');
fs.writeFileSync(destination,JSON.stringify(output,null,2)+'\n');
console.log(output.games.length+' unique indexed URLs; five original mirrors preserved. Coverage: partial.');
