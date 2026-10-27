// These functions run inside the browser via CDP. Keep them self-contained.
export function actualContrast(selectors) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  const rgba = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1); const d=ctx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255]; };
  const over = (a,b) => [0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
  function background(el) {
    if(!el) return [255,255,255,1];
    const style=getComputedStyle(el), color=rgba(style.backgroundColor);
    if(style.backgroundImage!=='none') throw new Error('Gradient needs explicit sampling: '+el.className);
    return color[3]===1?color:over(color,background(el.parentElement));
  }
  const luminance = rgb => {const c=rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  return selectors.map(selector=>{
    const el=document.querySelector(selector);if(!el) throw new Error('Missing contrast target: '+selector);
    const style=getComputedStyle(el),bg=background(el),fg=over(rgba(style.color),bg),a=luminance(fg),b=luminance(bg);
    return {selector,foreground:style.color,background:bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
}

export async function inspectLayout() {
  const clipped=[],small=[],overlaps=[],occluded=[];
  const scope=document.querySelector('dialog[open]')||document.body;
  const label=el=>`${el.tagName.toLowerCase()}.${String(el.className).replaceAll(' ','.')} ${(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,70)}`;
  const visible=el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden' && !el.closest('[hidden], [aria-hidden="true"], script, style, svg, option, .skip-link');
  const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
  let node,textCount=0;
  while((node=walker.nextNode())) {
    const el=node.parentElement;
    if(!node.textContent.trim()||!visible(el)||el.closest('select'))continue;
    textCount++;
    const range=document.createRange();range.selectNodeContents(node);
    for(const rect of range.getClientRects()) {
      let ancestor=el;
      while(ancestor&&ancestor!==document.body) {
        const style=getComputedStyle(ancestor),box=ancestor.getBoundingClientRect();
        const clipX=['hidden','clip','auto','scroll'].includes(style.overflowX);
        const clipY=['hidden','clip','auto','scroll'].includes(style.overflowY);
        const left=box.left+ancestor.clientLeft,top=box.top+ancestor.clientTop;
        if((clipX&&(rect.left<left-1.5||rect.right>left+ancestor.clientWidth+1.5)) || (clipY&&(rect.top<top-1.5||rect.bottom>top+ancestor.clientHeight+1.5))) {
          clipped.push({text:node.textContent.trim().slice(0,80),element:label(el),ancestor:label(ancestor),scroll:[ancestor.scrollWidth,ancestor.scrollHeight],client:[ancestor.clientWidth,ancestor.clientHeight]});break;
        }
        ancestor=ancestor.parentElement;
      }
    }
  }
  const controls=[...scope.querySelectorAll('a[href],button,input:not([type="hidden"]),select')].filter(visible);
  // Compare controls within their layout, excluding fixed navigation versus the
  // scrolling document; reachability beneath fixed layers is checked below.
  const inContent=controls.filter(el=>el.closest('.view-root') && !el.closest('.studio-preview-panel'));
  for(let i=0;i<inContent.length;i++)for(let j=i+1;j<inContent.length;j++) {
    const a=inContent[i],b=inContent[j];if(a.contains(b)||b.contains(a))continue;
    const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
    if(Math.min(ar.right,br.right)-Math.max(ar.left,br.left)>1 && Math.min(ar.bottom,br.bottom)-Math.max(ar.top,br.top)>1)overlaps.push([label(a),label(b)]);
  }
  for(const el of controls) {
    let r=el.getBoundingClientRect();
    // An associated visible label is also a clickable target for a checkbox.
    const target=el.matches('input[type="checkbox"],input[type="radio"]') && el.labels?.length ? el.labels[0].getBoundingClientRect() : r;
    if(target.width<24||target.height<24)small.push({element:label(el),width:target.width,height:target.height});
    if(el.disabled)continue;
    el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    await new Promise(requestAnimationFrame);
    r=el.getBoundingClientRect();
    const x=r.left+r.width/2,y=r.top+r.height/2;
    const hit=document.elementFromPoint(x,y);
    if(!hit||(!el.contains(hit)&&hit!==el))occluded.push({element:label(el),hit:hit?label(hit):null});
  }
  return {textCount,controlCount:controls.length,clipped,small,overlaps,occluded};
}

export function accentSnapshot() {
  const active=getComputedStyle(document.querySelector('.nav-item.active'));
  const brand=getComputedStyle(document.querySelector('.brand-mark'));
  return {theme:document.documentElement.dataset.theme,activeColor:active.color,activeBackground:active.backgroundColor,brandColor:brand.color,brandBackground:brand.backgroundColor};
}
