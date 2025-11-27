const puppeteer = require('puppeteer');

(async () => {
  const ports=[5176,5174,5173];
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try{
    const page = await browser.newPage();
    const logs=[];
    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));
    page.on('pageerror', err => logs.push({type:'pageerror', text: String(err && (err.stack||err.message||err))}));

    for(const p of ports){
      const u=`http://localhost:${p}/`;
      try{
        console.log('Trying',u);
        await page.goto(u, {waitUntil:'networkidle2', timeout:10000});
        console.log('Loaded, waiting 5s for app to hydrate...');
        await new Promise(r=>setTimeout(r,5000));
        const content = await page.content();
        console.log('=== PAGE CONTENT START ===');
        console.log(content.slice(0,4000));
        console.log('=== PAGE CONTENT END ===');
        console.log('=== CONSOLE LOGS ===');
        console.log(JSON.stringify(logs,null,2));
        return;
      }catch(e){
        console.log('Failed to load',u, e && e.message);
      }
    }
    console.error('No page loaded');
  }finally{ await browser.close(); }
})();
