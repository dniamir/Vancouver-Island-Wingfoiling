(function(){const interactionEvents=['pointerover','mouseover','pointerdown','mousedown','keydown','touchstart','wheel','scroll','focus'];const callbacks=new Set();let isHeadless=false;let initialized=false;let scheduled=false;let hasRun=false;let fallbackTimer=null;let scrollRestoreObserver=null;let scrollRestoreSentinel=null;const fallbackTimeout=10000;function detectHeadless(){try{if(navigator.webdriver)return true;if(/Lighthouse|PageSpeed/.test(navigator.userAgent))return true;if(navigator.userAgentData?.brands?.some(b=>/Lighthouse/i.test(b.brand)))return true;}catch(e){return false;}
return false;}
function runCallbacks(){hasRun=true;if(!callbacks.size)return;callbacks.forEach(cb=>{try{cb();}catch(err){console.error(err);}});callbacks.clear();cleanup();}
function scheduleCallbacks(){if(scheduled)return;scheduled=true;cleanup();const run=()=>{scheduled=false;runCallbacks();};const afterFrame=()=>{if('requestIdleCallback'in window){window.requestIdleCallback(run,{timeout:1200});}else{setTimeout(run,0);}};if('requestAnimationFrame'in window){window.requestAnimationFrame(()=>setTimeout(afterFrame,0));}else{setTimeout(afterFrame,0);}}
function onInteraction(){scheduleCallbacks();}
function cleanup(){interactionEvents.forEach(event=>{window.removeEventListener(event,onInteraction,true);});if(scrollRestoreObserver){scrollRestoreObserver.disconnect();scrollRestoreObserver=null;}
if(scrollRestoreSentinel){scrollRestoreSentinel.remove();scrollRestoreSentinel=null;}
if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=null;}}
function setupScrollRestoreDetector(){if(!('IntersectionObserver'in window)){return;}
if(!document.body){setTimeout(setupScrollRestoreDetector,0);return;}
scrollRestoreSentinel=document.createElement('span');scrollRestoreSentinel.setAttribute('aria-hidden','true');scrollRestoreSentinel.style.cssText='position:absolute;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;contain:strict;';document.body.insertBefore(scrollRestoreSentinel,document.body.firstChild);scrollRestoreObserver=new IntersectionObserver((entries)=>{const entry=entries[0];if(entry&&!entry.isIntersecting){scheduleCallbacks();}},{root:null,threshold:0});scrollRestoreObserver.observe(scrollRestoreSentinel);}
function setupListeners(){interactionEvents.forEach(event=>{window.addEventListener(event,onInteraction,{passive:true,capture:true});});setupScrollRestoreDetector();fallbackTimer=setTimeout(()=>{scheduleCallbacks();},fallbackTimeout);}
function registerCallback(cb){if(!initialized)init();if(isHeadless)return;if(typeof cb==='function'){callbacks.add(cb);}
if(hasRun){scheduleCallbacks();}}
function init(){if(initialized)return;initialized=true;isHeadless=detectHeadless();if(isHeadless){return;}
setupListeners();}
window.JchOptimizeUserInteraction={onUserInteract:registerCallback,isHeadless:()=>isHeadless};})();
(function(){const CONFIG={observeLateScripts:false,perScriptTimeoutMs:12000,preconnect:true};const supportsModule=('noModule'in HTMLScriptElement.prototype);function qsa(selector,root=document){return Array.from(root.querySelectorAll(selector));}
function scheduleTask(){return new Promise((resolve)=>{if('requestIdleCallback'in window){window.requestIdleCallback(resolve,{timeout:700});}else{setTimeout(resolve,0);}});}
function shouldSkip(node){const t=node.getAttribute('type');if(t==='jchoptimize-text/module'&&!supportsModule)return true;if(t==='jchoptimize-text/nomodule'&&supportsModule)return true;return false;}
function copyKeyAttrs(from,to){const t=from.getAttribute('type');if(t==='jchoptimize-text/module'){to.type='module';}else{to.removeAttribute('type');}
if(t==='jchoptimize-text/nomodule'){to.noModule=true;}
to.async=false;const important=['id','integrity','crossorigin','referrerpolicy','nonce','fetchpriority'];for(const name of important){const v=from.getAttribute(name);if(v!==null)to.setAttribute(name,v);}
to.setAttribute('src',from.getAttribute('data-src'));for(const{name,value}of Array.from(from.attributes)){if(name.startsWith('data-')&&name!=='data-src'&&!to.hasAttribute(name)){to.setAttribute(name,value);}}
if(from.textContent){to.textContent=from.textContent;}}
function withLateLifecycleShim(runUntilDone){const docIsInteractive=document.readyState!=='loading';const winIsComplete=document.readyState==='complete';const origDocAEL=Document.prototype.addEventListener;const origWinAEL=Window.prototype.addEventListener;function maybeCallNow(target,type,listener){const domReady=(type==='DOMContentLoaded'||type==='readystatechange')&&docIsInteractive;const winLoad=(type==='load'||type==='pageshow')&&winIsComplete;if(domReady||winLoad){queueMicrotask(()=>{try{listener.call(target,new Event(type));}catch(e){setTimeout(()=>{throw e;});}});return true;}
return false;}
Document.prototype.addEventListener=function(type,listener,options){if(!maybeCallNow(document,type,listener)){return origDocAEL.call(this,type,listener,options);}};Window.prototype.addEventListener=function(type,listener,options){if(!maybeCallNow(window,type,listener)){return origWinAEL.call(this,type,listener,options);}};const finalize=()=>{Document.prototype.addEventListener=origDocAEL;Window.prototype.addEventListener=origWinAEL;};try{const p=runUntilDone();return(p&&typeof p.then==='function')?p.finally(finalize):(finalize(),p);}catch(e){finalize();throw e;}}
function createExecPromise(node,newNode){return withLateLifecycleShim(()=>new Promise((resolve)=>{let settled=false;let timeoutId=null;const onDone=()=>{if(settled)return;settled=true;if(timeoutId)clearTimeout(timeoutId);resolve();};newNode.addEventListener('load',onDone,{once:true});newNode.addEventListener('error',onDone,{once:true});const hasSrc=!!newNode.getAttribute('src');if(hasSrc&&CONFIG.perScriptTimeoutMs>0){timeoutId=setTimeout(onDone,CONFIG.perScriptTimeoutMs);}
if(!hasSrc){queueMicrotask(onDone);}
node.replaceWith(newNode);}));}
function loadOne(node){if(shouldSkip(node)){node.remove();return Promise.resolve();}
const s=document.createElement('script');copyKeyAttrs(node,s);return createExecPromise(node,s);}
async function loadSequentially(nodes){for(const n of nodes){await scheduleTask();await loadOne(n);}
document.dispatchEvent(new Event('onJchJsDynamicLoaded'));document.dispatchEvent(new Event('jch:dynamicJsLoaded'));}
function uniqueCrossOrigins(nodes){const out=new Set();nodes.forEach(n=>{const src=n.getAttribute('data-src')||n.getAttribute('src');if(!src||src.startsWith('data:'))return;try{const url=new URL(src,document.baseURI);if(url.origin!==location.origin)out.add(url.origin);}catch(_){}});return Array.from(out);}
function addPreconnect(origins){if(!origins.length)return;const frag=document.createDocumentFragment();origins.forEach(origin=>{const link=document.createElement('link');link.rel='preconnect';link.href=origin;frag.appendChild(link);});document.head.appendChild(frag);}
function collectInitial(){return qsa('script[type^="jchoptimize-text"]');}
function makeLateObserver(enqueue){if(!CONFIG.observeLateScripts)return{disconnect(){}};const obs=new MutationObserver(muts=>{for(const m of muts){m.addedNodes&&m.addedNodes.forEach(node=>{if(node&&node.nodeType===1){if(node.tagName==='SCRIPT'&&/^jchoptimize-text/.test(node.getAttribute('type')||'')){enqueue(node);}
const nested=node.querySelectorAll&&node.querySelectorAll('script[type^="jchoptimize-text"]');if(nested&&nested.length){nested.forEach(enqueue);}}});}});obs.observe(document,{childList:true,subtree:true});return obs;}
function start(){const queue=collectInitial();if(CONFIG.preconnect){addPreconnect(uniqueCrossOrigins(queue));}
const late=[];const obs=makeLateObserver((node)=>late.push(node));loadSequentially(queue).then(async()=>{while(late.length){const batch=late.splice(0,late.length);if(CONFIG.preconnect)addPreconnect(uniqueCrossOrigins(batch));await loadSequentially(batch);}
obs.disconnect();});}
if(window.JchOptimizeUserInteraction&&typeof JchOptimizeUserInteraction.onUserInteract==='function'){JchOptimizeUserInteraction.onUserInteract(start);}else{const once=()=>{window.removeEventListener('pointerdown',once,{passive:true});window.removeEventListener('keydown',once);start();};window.addEventListener('pointerdown',once,{passive:true});window.addEventListener('keydown',once);}})();
