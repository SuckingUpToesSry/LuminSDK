const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../assets/js/personal.js'),'utf8');
function boot(saved, unavailable = false) {
  const store = new Map(saved ? [['luminsdk:personal:v1',saved]] : []), attrs = {};
  const window = {};
  const document = { hidden:false,readyState:'loading',addEventListener() {},documentElement:{ setAttribute:(key,value) => attrs[key]=value } };
  const localStorage = { getItem:key => { if(unavailable) throw Error('blocked'); return store.get(key)||null; }, setItem:(key,value) => { if(unavailable) throw Error('blocked'); store.set(key,value); } };
  vm.runInNewContext(source,{window,document,localStorage});
  return { api:window.LuminPersonal, store, attrs };
}
test('personal defaults preserve study landing and never request a remote account', () => {
  const { api,attrs }=boot(); assert.equal(api.get().start,'estudo'); assert.equal(api.get().look,'edit');
  assert.equal(attrs['data-personal-focus'],'false'); assert.equal(api.get().reminder,'0');
  assert.equal(api.session().paused,false);
});
test('personal settings are validated, bounded, persisted and reloadable', () => {
  const {api,store}=boot();
  assert.equal(api.set('start','other-host'),false); assert.equal(api.set('focus','true'),false);
  assert.equal(api.set('__proto__',{}),false); assert.equal(api.set('name','x'.repeat(60)),true);
  assert.equal(api.get().name.length,24); assert.equal(api.set('start','hub'),true);
  assert.equal(api.set('flash',false),true); assert.equal(api.set('shake','soft'),true);
  const second=boot(store.get('luminsdk:personal:v1')); assert.equal(second.api.get().start,'hub'); assert.equal(second.api.get().flash,false);
  const copy=api.get(); copy.start='os'; assert.equal(api.get().start,'hub');
});
test('corrupt or unavailable storage cannot prevent local preferences from working', () => {
  assert.equal(boot('{broken').api.get().start,'estudo');
  const {api}=boot(null,true); api.set('focus',true); assert.equal(api.get().focus,true); assert.equal(api.storage(),false);
});
test('reset only touches personal keys, not games, notes in OS or study progress', () => {
  const {api,store}=boot(); store.set('studydesk:v2:learning','keep'); store.set('luminsdk-favorites','keep');
  api.set('name','Local'); api.reset(); assert.equal(api.get().name,'');
  assert.equal(store.get('studydesk:v2:learning'),'keep'); assert.equal(store.get('luminsdk-favorites'),'keep');
});
