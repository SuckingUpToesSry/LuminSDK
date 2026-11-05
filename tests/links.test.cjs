const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function boot() {
  const handlers = {}, opened = [];
  const window = {LuminGameTab:{open:(...args) => {opened.push(args); return true;}}};
  const document = {baseURI:'https://portal.example/index.html',addEventListener:(type,handler) => handlers[type]=handler};
  vm.runInNewContext(read('assets/js/links.js'),{window,document,URL});
  function click(href,options={}) {
    let stopped=false, prevented=false;
    const link = {textContent:'Destination',getAttribute:key => key === 'href' ? href : null,hasAttribute:key => key==='download' && options.download,closest:() => options.route};
    const event = {type:options.middle?'auxclick':'click',button:options.middle?1:0,ctrlKey:!!options.ctrl,metaKey:!!options.meta,target:{closest:() => link},preventDefault:() => prevented=true,stopImmediatePropagation:() => stopped=true};
    handlers[event.type](event); return {stopped,prevented};
  }
  return {api:window.LuminLinks,opened,click};
}
test('normal, modified and middle clicks route HTTP links through the iframe helper exactly once', () => {
  const state=boot();
  for (const options of [{},{ctrl:true},{meta:true},{middle:true}]) assert.deepEqual(state.click('https://example.com/play',options),{stopped:true,prevented:true});
  assert.equal(state.opened.length,4); assert.ok(state.opened.every(([url]) => url==='https://example.com/play'));
  state.click('/file.pdf'); assert.equal(state.opened.at(-1)[0],'https://portal.example/file.pdf');
});
test('internal controls, anchors and explicit downloads do not become site launches', () => {
  const state=boot();
  for (const [href,options] of [['#faq',{}],['https://example.com/file',{download:true}],['./',{route:true}],['mailto:author@example.com',{}],['blob:https://portal.example/file',{download:true}]]) assert.equal(state.click(href,options).prevented,false);
  assert.equal(state.opened.length,0);
  for (const bad of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com/']) assert.equal(state.api.open(bad),false);
});
test('there are no direct-tab or same-tab escape fallbacks in site launcher modules', () => {
  for (const name of ['sites','browser','provider','gnmath','os','astolfo','hub','links']) {
    const source = read('assets/js/'+name+'.js');
    assert.doesNotMatch(source,/window\.open\s*\(|\.location\.(?:href\s*=|replace\()/,name);
  }
  const html = read('single/index.html'); assert.ok(html.includes('window.LuminLinks ='));
  assert.ok(html.indexOf('window.LuminGameTab =')<html.indexOf('window.LuminLinks ='));
});
test('Lumin, GN-Math and provider play actions delegate to about:blank launchers, not inline players', async () => {
  const library = read('assets/js/library.js'), gn = read('assets/js/gnmath.js'), provider = read('assets/js/provider.js');
  let launched, reservedPassed; const game = {id:'42',name:'Test',n:'Test',url:'https://games.example/test.html'};
  const libraryContext = {state:{mode:'live'},recordRecent(){},recordPlay(){},toast(){},openGameInNewTab:tab => reservedPassed=tab};
  vm.createContext(libraryContext);
  vm.runInContext(library.slice(library.indexOf('  async function openGame(game,'),library.indexOf('  function closeGame()')),libraryContext);
  const reserved={}; await libraryContext.openGame(game,game.name,reserved); assert.equal(reservedPassed,reserved);
  const gnContext={state:{},pushRecent(){},fileSources:()=>[game.url],openGameTab:url => launched=url}; vm.createContext(gnContext);
  vm.runInContext(gn.slice(gn.indexOf('  function openGame(game)'),gn.indexOf('  function openGameTab')),gnContext);
  gnContext.openGame(game); assert.equal(launched,game.url);
  launched=null;
  const providerContext={state:{},cleanTab:url => launched=url}; vm.createContext(providerContext);
  vm.runInContext(provider.slice(provider.indexOf('  function playItem(item)'),provider.indexOf('  function closePlayer()')),providerContext);
  providerContext.playItem(game); assert.equal(launched,game.url);
});
