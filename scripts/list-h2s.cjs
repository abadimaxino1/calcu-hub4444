const puppeteer = require('puppeteer');
(async()=>{
  const browser=await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page=await browser.newPage();
  try{
    await page.goto('http://localhost:5174/', {waitUntil:'networkidle2', timeout:10000});
    await new Promise(r=>setTimeout(r,3000));
    const h2s = await page.evaluate(()=> Array.from(document.querySelectorAll('h2')).map(h=>h.innerText));
    console.log(JSON.stringify(h2s,null,2));
  }catch(e){ console.error('ERR', e && e.message); }
  await browser.close();
})();
