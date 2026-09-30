const fs = require('fs');
const path = require('path');
const assert = require('assert');
const modules = 'C:/Users/TECH DOMIN IT SOLU/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const { chromium } = require(modules+'playwright');
const { PNG } = require(modules+'pngjs');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 let html=fs.readFileSync('infographic-background-to-white (4).html','utf8');
 html=html.replace('  applySettingsToUI();\n  setTool', '  window.testApp = {state, composeAll, undoMask, redoMask, pushHistory};\n  applySettingsToUI();\n  setTool');
 await page.setContent(html);
 const input='C:/Users/TECHDO~1/AppData/Local/Temp/codex-clipboard-3e30cd81-9e95-43a1-b610-5d950d6499bf.png';
 await page.locator('#fileInput').setInputFiles(input);
 await page.waitForFunction(()=>window.testApp.state.autoMask && !window.testApp.state.busy,{},{timeout:180000});
 fs.mkdirSync('output',{recursive:true});
 const downloadEvent=page.waitForEvent('download');
 await page.locator('#downloadBtn').click();
 const download=await downloadEvent;
 await download.saveAs(path.resolve('output/infographic-white.png'));
 await page.screenshot({path:'output/tool-preview.png'});
 console.log(await page.locator('#coverageText').textContent());
 const result=await page.evaluate(()=>{
   const {state:s,composeAll}=window.testApp;
   const idx=500*s.width+500, o=idx*4;
   const saved=Array.from(s.orig.slice(o,o+4));
   const results=[];
   for(const style of ['clean','relight','soft','exact']) {
     s.settings.shadows=style;s.manual[idx]=2;composeAll();
     if(JSON.stringify(Array.from(s.procImage.data.slice(o,o+4)))!==JSON.stringify(saved))throw Error('Protect failed '+style);
     s.manual[idx]=1;composeAll();
     if(!s.procImage.data.slice(o,o+4).every(v=>v===255))throw Error('Remove failed '+style);
     results.push(style);
   }
   s.manual[idx]=0;s.settings.shadows='clean';composeAll();
   window.testApp.pushHistory({indices:Int32Array.of(idx),prev:Uint8Array.of(0),value:1,bbox:[500,500,501,501]});s.manual[idx]=1;
   window.testApp.undoMask();if(s.manual[idx]!==0)throw Error('Undo failed');
   window.testApp.redoMask();if(s.manual[idx]!==1)throw Error('Redo failed');
   return {styles:results,width:s.width,height:s.height};
 });
 assert.equal(errors.length,0,errors.join('\n'));
 const out=PNG.sync.read(fs.readFileSync('output/infographic-white.png'));
 const target=PNG.sync.read(fs.readFileSync('C:/Users/TECHDO~1/AppData/Local/Temp/codex-clipboard-7f05a772-1705-4ebe-b8a2-fab77dab1dcd.png'));
 assert.equal(out.width,target.width);assert.equal(out.height,target.height);
 let sum=0,white=0,match=0;
 for(let i=0;i<out.data.length;i+=4){for(let c=0;c<3;c++)sum+=Math.abs(out.data[i+c]-target.data[i+c]);if(target.data[i]===255&&target.data[i+1]===255&&target.data[i+2]===255){white++;if(out.data[i]===255&&out.data[i+1]===255&&out.data[i+2]===255)match++;}}
 console.log(JSON.stringify({...result,meanAbsoluteRGBError:sum/(out.width*out.height*3),targetWhitePixelsMatched:match/white,errors},null,2));
 assert(sum/(out.width*out.height*3)<4, 'Reference comparison regressed');
 assert(match/white>0.9, 'White background coverage regressed');
 // Reload a tiny RGBA image to exercise allocation, alpha handling and stale state.
 const tiny=new PNG({width:16,height:16});
 for(let i=0;i<tiny.data.length;i+=4){tiny.data[i]=30;tiny.data[i+1]=70;tiny.data[i+2]=90;tiny.data[i+3]=i===0?0:128;}
 await page.locator('#fileInput').setInputFiles({name:'alpha.png',mimeType:'image/png',buffer:PNG.sync.write(tiny)});
 await page.waitForFunction(()=>window.testApp.state.width===16 && window.testApp.state.autoMask && !window.testApp.state.busy,{},{timeout:30000});
 await page.evaluate(()=>{
   const {state:s,composeAll}=window.testApp;
   if(s.undoStack.length || s.redoStack.length || s.manual.some(v=>v))throw Error('Stale history or brush state');
   s.manual[1]=2;composeAll();
   if(s.procImage.data[7]!==s.orig[7])throw Error('Protected alpha changed');
   s.manual[1]=1;composeAll();
   if(!s.procImage.data.slice(4,8).every(v=>v===255))throw Error('Transparent remove failed');
   s.manual[1]=0;s.settings.flatten=true;composeAll();
   if(s.procImage.data[7]!==255)throw Error('Flatten failed');
 });
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: reference, exports, all styles, brushes, undo/redo, image reload, transparency and flatten.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
