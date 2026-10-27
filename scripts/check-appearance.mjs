import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { actualContrast, inspectLayout, accentSnapshot } from './appearance-audit.mjs';

const out = (process.env.REVIEW_OUTPUT || path.join(os.tmpdir(),'lifeskill-appearance-review-artifacts')) + path.sep;
await fs.mkdir(out, { recursive: true });
const targets = await (await fetch((process.env.REVIEW_CDP_URL || 'http://127.0.0.1:9333') + '/json/list')).json();
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map(), errors = [], results = [];
const pausedRequests = [];
ws.onmessage = e => {
  const message = JSON.parse(e.data);
  if (message.id) {
    const request = pending.get(message.id); pending.delete(message.id);
    message.error ? request.reject(message.error) : request.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  else if (message.method === 'Runtime.consoleAPICalled' && message.params.type==='error') errors.push(message.params.args.map(arg=>arg.value ?? arg.description));
  else if (message.method === 'Fetch.requestPaused') pausedRequests.push(message.params.requestId);
};
const call = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
async function evaluate(expression) {
  const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression) {
  for (let i = 0; i < 120; i++) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch {}
    await pause(50);
  }
  throw new Error('Timed out: ' + expression);
}
const base = process.env.REVIEW_APP_URL || 'http://127.0.0.1:3189';
const KEY = 'kiraquest.customization.v1';
async function route(path = '/studio') {
  await call('Page.navigate', { url: base + path });
  await wait(`location.href === ${JSON.stringify(base+path)} && document.readyState === 'complete' && document.querySelector('.theme-toggle:not(:disabled)')`);
  if (path === '/studio') await wait(`!!document.querySelector('.theme-grid')`);
  if (path === '/map') await wait(`!!document.querySelector('.journey-node')`);
}
async function reload() {
  await call('Page.reload');
  await pause(150);
  await wait(`document.readyState === 'complete' && document.querySelector('.theme-toggle:not(:disabled)')`);
  if (await evaluate(`location.pathname === '/studio'`)) await wait(`!!document.querySelector('.theme-grid')`);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await pause(70);
}
async function input(selector, value) {
  await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(70);
}
async function seed(overrides, path='/studio') {
  await evaluate(`localStorage.setItem(${JSON.stringify(KEY)},JSON.stringify(${JSON.stringify({version:1,theme:'lavender',lastLightTheme:'lavender',accentMode:'theme',accent:'#8064d8',background:'quiet',customBackground:'#f4f0fb',fontScale:1,density:'comfortable',mascot:{id:'miko',accessory:'none'},animations:false,sounds:false,quoteFrequency:'sometimes',largeText:false,...overrides})}))`);
  await route(path);
}
async function shot(name) { const {data} = await call('Page.captureScreenshot', {format:'png'}); await fs.writeFile(out + name + '.png', Buffer.from(data,'base64')); }
const theme = () => evaluate('document.documentElement.dataset.theme');
const saved = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}))`);
const record = (name, details) => { results.push({name,details}); console.log('PASS', name, JSON.stringify(details ?? '')); };
const font = selector => evaluate(`parseFloat(getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fontSize)`);
async function overflow() {
  return evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)&&getComputedStyle(el).position!=='absolute'}).slice(0,8).map(el=>el.className)})`);
}
try {
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await route();
  // Migrate a real old schema, then exercise the header across a page reload.
  await evaluate(`localStorage.setItem(${JSON.stringify(KEY)},JSON.stringify({version:1,theme:'ocean',accent:'#8064d8',background:'quiet'}))`);
  await reload(); assert.equal(await theme(), 'ocean');
  await click('.theme-toggle'); assert.equal(await theme(), 'dark'); assert.equal((await saved()).lastLightTheme,'ocean');
  await reload(); await click('.theme-toggle'); assert.equal(await theme(),'ocean');
  record('Previous light theme survives reload; old schema migrates');

  await click('.theme-amber'); assert.equal(await theme(),'ocean');
  const previewAccent = await evaluate(`document.querySelector('.studio-preview-panel').style.getPropertyValue('--accent')`);
  await click('.studio-actions .button-dark'); assert.equal(await theme(),'amber');
  assert.equal(await evaluate(`document.documentElement.style.getPropertyValue('--accent')`),previewAccent);
  await click('.theme-mint'); await click('.studio-actions .button-outline');
  assert.equal(await evaluate(`document.querySelector('.theme-choice.chosen').classList.contains('theme-amber')`),true);
  record('Theme palette, staged preview, save and cancel');

  await click('.studio-tabs button:nth-child(3)');
  await input('input[type="range"]','1.2');
  await evaluate(`(()=>{const el=document.querySelector('.studio-setting select');el.value='compact';el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(50);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.appearance-sample')).paddingTop`),'12px');
  assert.ok((await font('.appearance-sample'))>16);
  assert.equal((await saved()).fontScale,1);
  await click('.studio-actions .button-dark');await reload();assert.equal((await saved()).fontScale,1.2);assert.equal((await saved()).density,'compact');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.appearance-sample')).paddingTop`),await evaluate(`getComputedStyle(document.querySelector('.studio-options')).paddingTop`));
  record('Text and density controls preview before save and persist after reload');

  await input('input[aria-label="Свой цвет акцента"]','#ffffff');
  await click('.studio-actions .button-dark'); assert.equal((await saved()).accentMode,'custom');
  await click('.theme-forest'); await click('.studio-actions .button-dark'); assert.equal((await saved()).accent,'#ffffff');
  await click('.accent-mode button:first-child'); await click('.studio-actions .button-dark'); assert.equal((await saved()).accentMode,'theme');
  record('Custom accent persists between palettes; theme mode restores its own colour');

  const contrast = [];
  for (const themeId of ['light','dark']) for (const color of ['#ffffff','#000000','#ffff00','#00ff00']) {
    await seed({theme:themeId,accentMode:'custom',accent:color});
    const values = await evaluate(`(() => {
      const s=document.documentElement.style;const c=k=>s.getPropertyValue(k).trim();
      const l=h=>{const a=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
      const ratio=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
      return {accent:c('--accent'),text:Math.min(...['--paper','--surface','--accent-soft'].map(k=>ratio(c('--accent'),c(k)))),button:ratio(c('--accent'),c('--on-accent'))};
    })()`);
    assert.ok(values.text >=4.5 && values.button >=4.5, JSON.stringify(values));
    contrast.push({theme:themeId,color,...values});
    const actual=await evaluate(`(${actualContrast.toString()})(${JSON.stringify(['.nav-item.active','.brand-mark','.studio-tabs button.selected','.appearance-sample span','.studio-actions .button-soft'])})`);
    assert.ok(actual.every(item=>item.ratio>=4.5),JSON.stringify({themeId,color,actual}));
    contrast[contrast.length-1].actual=actual;
  }
  record('Extreme accents: text and button contrast >=4.5',contrast);

  await seed({},'/map'); const mapSize=await font('.node-copy>small');
  const regularGap=await evaluate(`getComputedStyle(document.querySelector('.learning-map-page')).gap`);
  await seed({fontScale:1.2,largeText:true,density:'compact'},'/map');
  const scaledMapSize=await font('.node-copy>small');
  assert.ok(scaledMapSize/mapSize>1.36);
  const compactGap=await evaluate(`getComputedStyle(document.querySelector('.learning-map-page')).gap`);
  assert.ok(parseFloat(compactGap)<parseFloat(regularGap));
  await seed({},'/studio'); const studioSize=await font('.theme-choice b');
  await seed({fontScale:1.2,largeText:true},'/studio');const scaledStudioSize=await font('.theme-choice b');
  assert.ok(scaledStudioSize/studioSize>1.36);
  record('Small labels scale and compact map spacing applies',{mapSize,scaledMapSize,studioSize,scaledStudioSize,regularGap,compactGap});

  // Keyboard focus through actual CDP keyboard events, not a CSS class.
  await evaluate(`document.activeElement.blur()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  const focus=await evaluate(`({tag:document.activeElement.tagName,visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineWidth})`);
  assert.ok(focus.visible && parseFloat(focus.outline)>=3);record('Keyboard focus visible',focus);

  const layoutChecks=[];
  for (const width of [1440,390]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    for (const themeId of ['light','dark','lavender','amber','mint','sakura','ocean','forest','mono']) {
      await seed({theme:themeId,fontScale:1.2,largeText:true,density:'compact'},'/studio');
      const size=await overflow();assert.ok(size.scroll<=width+1,JSON.stringify({themeId,...size}));
      layoutChecks.push({width,theme:themeId,scroll:size.scroll});
    }
    for (const path of ['/','/map','/lessons','/lessons?lesson=hello-1','/mascots','/profile']) {
      await seed({theme:'dark',fontScale:1.2,largeText:true,density:'compact'},path);
      const size=await overflow();assert.ok(size.scroll<=width+1,JSON.stringify({path,...size}));
      layoutChecks.push({width,path,scroll:size.scroll});
      if (path==='/map') {
        await shot(`dark-map-${width}`);
        await click('.node-locked');await wait(`document.querySelector('dialog[open]')`);
        assert.ok((await overflow()).scroll<=width+1);
        await shot(`dark-dialog-${width}`);await click('.lesson-dialog-close');
      }
      if (path==='/lessons?lesson=hello-1') await shot(`dark-lesson-${width}`);
    }
    await seed({theme:'dark'},'/studio');await shot(`dark-studio-${width}`);
  }
  record('9 themes at 390 and 1440; dark routes and dialog at largest text size',layoutChecks);

  const audits=[];
  for(const width of [390,1440]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    for(const path of ['/studio','/map','/lessons?lesson=hello-1','/','/profile','/mascots']) {
      await seed({theme:'dark',fontScale:1.2,largeText:true,density:'compact'},path);
      const categories=path==='/studio'?[1,2,3]:[null];
      for(const category of categories) {
        if(category)await click(`.studio-tabs button:nth-child(${category})`);
        const audit=await evaluate(`(${inspectLayout.toString()})()`);
        audits.push({width,path,category,...audit});
        await fs.writeFile(out+'layout-audits.json',JSON.stringify(audits,null,2));
        await evaluate('scrollTo(0,0)');await shot(`max-text-${path.replace(/[^a-z0-9]/gi,'_')}-${category??0}-${width}`);
        if(path==='/studio'||path==='/map') {
          await evaluate(`document.querySelector(${JSON.stringify(path==='/studio'?'.studio-controls':'.map-course-world:last-child')}).scrollIntoView({block:'start',behavior:'instant'})`);
          await shot(`max-text-details-${path.slice(1)}-${category??0}-${width}`);
        }
      }
    }
  }
  const layoutFailures=audits.filter(audit=>audit.clipped.length+audit.small.length+audit.overlaps.length+audit.occluded.length);
  assert.equal(layoutFailures.length,0,JSON.stringify(layoutFailures));
  record('Text clipping, 24px targets, control overlaps and hit testing at maximum text size',audits.map(({width,path,category,textCount,controlCount})=>({width,path,category,textCount,controlCount})));

  // Delay the actual application chunk, keeping the SSR page visible without
  // hydration. This catches accent flashes hidden by fast React startup.
  const chunksDir=path.resolve('.next/static/chunks');
  const chunkFiles=(await fs.readdir(chunksDir,{recursive:true})).filter(file=>file.endsWith('.js'));
  const appChunks=[];
  for(const file of chunkFiles)if((await fs.readFile(path.join(chunksDir,file),'utf8')).includes('useCustomization must be used inside CustomizationProvider'))appChunks.push(file.replaceAll('\\','/'));
  assert.ok(appChunks.length,'Cannot find application chunk to delay');
  const earlyChecks=[];
  await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  for(const settings of [{theme:'ocean',accentMode:'custom',accent:'#d36f91'},{theme:'dark',accentMode:'custom',accent:'#000000'},{theme:'ocean',accentMode:undefined,accent:'#008000'}]) {
    await seed(settings,'/studio');
    const expected=await evaluate(`(${accentSnapshot.toString()})()`);
    const {identifier:probe}=await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.earlyAccents=[];new PerformanceObserver(list=>{if(document.querySelector('.nav-item.active'))for(const entry of list.getEntries())window.earlyAccents.push({paint:entry.name,style:(${accentSnapshot.toString()})()})}).observe({type:'paint',buffered:true})`});
    pausedRequests.length=0;
    await call('Fetch.enable',{patterns:appChunks.map(file=>({urlPattern:'*/_next/static/chunks/'+file+'*',requestStage:'Request'}))});
    try {
      await call('Page.reload',{ignoreCache:true});
      await wait(`document.querySelector('.theme-toggle:disabled') && window.earlyAccents?.length>0`);
      assert.ok(pausedRequests.length,'Hydration was not delayed');
      const early=await evaluate(`(${accentSnapshot.toString()})()`),paints=await evaluate('window.earlyAccents');
      assert.deepEqual(early,expected);assert.ok(paints.every(p=>JSON.stringify(p.style)===JSON.stringify(expected)),JSON.stringify(paints));
      earlyChecks.push({settings,early,paints});
    } finally {
      for(const requestId of pausedRequests.splice(0))await call('Fetch.continueRequest',{requestId});
      await call('Fetch.disable');await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:probe});
    }
    await wait(`document.querySelector('.theme-toggle:not(:disabled)')`);
    assert.deepEqual(await evaluate(`(${accentSnapshot.toString()})()`),expected);
  }
  record('Actual accent before delayed hydration, at paint, and after hydration matches',earlyChecks);
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});

  await seed({theme:'dark',background:'custom',customBackground:'#ffffff'});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.view-root')).backgroundColor`),'rgb(23, 22, 29)');
  await seed({theme:'light',background:'custom',customBackground:'#000000'});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.view-root')).backgroundColor`),'rgb(248, 247, 244)');
  record('Custom wallpapers retain readable content surfaces');

  await evaluate(`localStorage.setItem(${JSON.stringify(KEY)},'{broken')`);await reload();
  assert.ok(await evaluate(`document.querySelector('.settings-warning').textContent.includes('повреждено')`));
  await click('.studio-actions .button-dark');assert.equal((await saved()).theme,'lavender');
  record('Corrupt settings show a message and can be repaired by Save');

  // Storage exceptions must not replace successfully saved state.
  await seed({theme:'ocean'});
  await evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError')}`);
  await click('.theme-toggle');assert.equal(await theme(),'ocean');
  assert.ok(await evaluate(`document.querySelector('.settings-warning').textContent.includes('Не удалось сохранить')`));
  await click('.theme-dark');await click('.studio-actions .button-dark');assert.equal(await theme(),'ocean');
  await evaluate('window.confirm=()=>true');await click('.studio-actions .button-soft');
  assert.ok(await evaluate(`document.querySelector('.theme-choice.chosen').classList.contains('theme-dark')`));assert.equal(await theme(),'ocean');
  await evaluate(`Storage.prototype.setItem=window.originalSetItem`);
  await click('.studio-actions .button-dark');assert.equal(await theme(),'dark');
  record('Storage failure feedback in header and studio; successful retry');

  await route('/map');assert.equal(await theme(),'dark');
  await click('.side-nav a[href="/studio"]');await wait(`!!document.querySelector('.theme-grid')`);assert.equal(await theme(),'dark');
  record('Saved theme follows client-side navigation');

  // A storage read failure is a different path from a failed save.
  const {identifier: denyRead} = await call('Page.addScriptToEvaluateOnNewDocument',{source:`const originalGet=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='${KEY}')throw new DOMException('Denied','SecurityError');return originalGet.call(this,key)}`});
  await reload();assert.ok(await evaluate(`document.querySelector('.settings-warning').textContent.includes('запретил доступ')`));
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:denyRead});await reload();
  record('Storage read failure shows a message without crashing');

  await seed({theme:'dark',lastLightTheme:'dark',accent:'bad-color',customBackground:'url(bad)',fontScale:5,mascot:null});
  assert.ok(await evaluate(`document.querySelector('.settings-warning').textContent.includes('Некорректные')`));
  await click('.studio-actions .button-dark');const repaired=await saved();
  assert.equal(repaired.lastLightTheme,'lavender');assert.equal(repaired.fontScale,1.2);assert.equal(repaired.accent,'#8064d8');assert.deepEqual(repaired.mascot,{id:'miko',accessory:'none'});
  record('Invalid fields are normalized and repaired on explicit save');

  await seed({theme:'dark'},'/lessons?lesson=hello-1');
  await click('.lesson-answer-option:first-child');await click('.lesson-question-footer button');
  assert.ok(await evaluate(`!!document.querySelector('.answer-is-wrong')`));
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.answer-is-wrong')).backgroundColor`),'rgb(64, 41, 46)');
  await shot('dark-answer-wrong-390');
  await click('.lesson-answer-option:nth-child(2)');await click('.lesson-question-footer button');
  assert.ok(await evaluate(`!!document.querySelector('.answer-is-correct')`));
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.answer-is-correct')).backgroundColor`),'rgb(38, 60, 49)');
  await shot('dark-answer-correct-390');
  await click('.lesson-question-footer button');await wait(`!!document.querySelector('.lesson-result-card')`);
  await shot('dark-result-390');await route('/map');
  assert.ok(await evaluate(`!!document.querySelector('.node-completed') && !!document.querySelector('.node-next')`));
  await evaluate(`document.querySelector('.map-course-world').scrollIntoView({block:'start'})`);
  await shot('dark-map-states-390');
  record('Wrong/correct answers, result, completed/next/available/locked map states');

  await seed({theme:'dark'},'/studio');
  const {identifier: paintProbe}=await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.themeAtPaint=[];new PerformanceObserver(list=>{for(const entry of list.getEntries())window.themeAtPaint.push({paint:entry.name,theme:document.documentElement.dataset.theme})}).observe({type:'paint',buffered:true})`});
  await reload();await pause(100);
  const paints=await evaluate('window.themeAtPaint');assert.ok(paints.length>0 && paints.every(p=>p.theme==='dark'),JSON.stringify(paints));
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:paintProbe});
  record('Dark theme present at paint callbacks on reload',paints);
  assert.equal(errors.length,0,JSON.stringify(errors));record('No uncaught browser exceptions');
} catch(error) {
  console.error('FAIL',error.stack||error);
  await shot('failure').catch(()=>{});
  process.exitCode=1;
} finally {
  await fs.writeFile(out+'browser-results.json',JSON.stringify({results,errors},null,2));
  ws.close();
}
