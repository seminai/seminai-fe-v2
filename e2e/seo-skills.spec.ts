import {test,expect} from '@playwright/test';
const base=process.env.SEO_PREVIEW_BASE??'http://127.0.0.1:8770';
const editorial=process.env.SEO_SKILLS_EDITORIAL==='1';
for(const lang of ['it','en'] as const) for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
 test(`skills ${lang} at ${viewport.width}px work without JavaScript`,async({browser,request})=>{
  await request.get(`http://127.0.0.1:9876/__control?mode=${editorial?'editorial':'published'}`);
  const context=await browser.newContext({javaScriptEnabled:false,locale:'it-IT',viewport});
  const page=await context.newPage();
  const path=`${lang==='en'?'/en':''}/skills/`;
  const response=await page.goto(base+path);
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('.skill-card')).toHaveCount(20);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://seminai.tech${path}`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/skills-${lang}-${viewport.width}.png`,fullPage:true});
  await page.getByRole('link',{name:lang==='en'?'Next':'Successiva',exact:false}).click();
  await expect(page.locator('.skill-card')).toHaveCount(20);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://seminai.tech${path}?page=2`);
  const slug=editorial?'meteo-risk-assessment':'synthetic-skill-1';
  await page.goto(`${base}${path}${slug}/`);
  await expect(page.locator('.skill-instructions')).toBeVisible();
  if(editorial) {
   await expect(page.locator('h1')).toHaveText(lang==='en'?'Weather risk assessment':'Valutazione rischio meteo');
   await expect(page.locator('.skill-instructions')).toContainText(lang==='en'?'Required input:':'Input richiesti:');
   await expect(page.locator('link[hreflang=it]')).toHaveAttribute('href',`https://seminai.tech/skills/${slug}/`);
  }
  await expect(page.getByRole('link',{name:lang==='en'?'Discuss this workflow in a demo':'Parliamone in demo',exact:true})).toHaveAttribute('href',lang==='en'?'/en/request-a-demo/':'/richiedi-demo/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/skill-detail-${lang}-${viewport.width}.png`,fullPage:true});
  await context.close();
 });
}
