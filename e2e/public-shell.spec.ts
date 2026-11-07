import {test,expect} from '@playwright/test';

const site=process.env.SEO_STATIC_BASE??'http://127.0.0.1:8765';
const catalogue=process.env.SEO_PREVIEW_BASE??'http://127.0.0.1:8770';

test('public navigation exposes skills only in the footer and the divider follows scrolling',async({browser,request})=>{
  await request.get(`http://127.0.0.1:9876/__control?mode=${process.env.SEO_SKILLS_EDITORIAL==='1'?'editorial':'published'}`);
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900},locale:'it-IT'});
    await context.addInitScript(()=>localStorage.setItem('seminai-cookie-consent',JSON.stringify({status:'denied',version:1})));
    const page=await context.newPage();
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const path of ['/risorse/','/en/resources/','/skills/','/en/skills/']) {
      await page.goto((path.includes('skills')?catalogue:site)+path);
      const header=page.locator('.site-header');
      await expect(header).toHaveAttribute('data-scrolled','false');
      await expect(header).toHaveCSS('border-bottom-color','rgba(0, 0, 0, 0)');
      await expect(header.locator('.nav-links a')).toHaveCount(4);
      await expect(header.locator('.nav-links a[href*="/skills/"],.nav-links a[href*="/resources/"],.nav-links a[href="/risorse/"]')).toHaveCount(0);
      if(!path.includes('skills')) {
        const links=page.locator('a[href="/skills/"],a[href="/en/skills/"]');
        await expect(links).toHaveCount(1);
        expect(await links.evaluateAll(items=>items.every(item=>item.closest('footer')))).toBe(true);
      }
      expect(await page.locator('.brand-img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
      await expect(header).toHaveAttribute('data-scrolled','true');
      await expect(header).toHaveCSS('border-bottom-color','rgba(231, 232, 228, 0.55)');
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      await expect(header).toHaveAttribute('data-scrolled','false');
      expect(errors).toEqual([]);
    }
    await context.close();
  }
});

test('the catalogue reuses landing styling and keeps English after hydration and cookie interaction',async({page,request})=>{
  await request.get(`http://127.0.0.1:9876/__control?mode=${process.env.SEO_SKILLS_EDITORIAL==='1'?'editorial':'published'}`);
  await page.addInitScript(()=>{
    localStorage.setItem('seminai-language','it');
    localStorage.setItem('seminai-cookie-consent',JSON.stringify({status:'denied',version:1}));
  });
  const style=()=>page.locator('.landing-page').evaluate(element=>{
    const value=getComputedStyle(element);
    return {font:value.fontFamily,background:value.backgroundColor,ink:value.getPropertyValue('--ink'),green:value.getPropertyValue('--green')};
  });
  await page.goto(site+'/en/');
  const landing=await style();
  await page.goto(catalogue+'/en/skills/');
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr','');
  expect(await style()).toEqual(landing);
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('h1')).toHaveText('Public AI skills catalogue');
  await expect(page.getByRole('link',{name:'Request a demo',exact:true})).toHaveAttribute('href','/en/request-a-demo/');
  await page.getByRole('button',{name:'Cookie preferences',exact:true}).click();
  await expect(page.locator('.cookie-banner')).toBeVisible();
  await page.locator('.cookie-banner .btn-secondary').click();
  await expect(page.locator('.cookie-banner')).toHaveCount(0);
  await page.screenshot({path:'test-results/skills-landing-style-en.png',fullPage:true});
});
