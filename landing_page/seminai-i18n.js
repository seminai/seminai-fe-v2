/* Seminai — IT/EN language toggle
 * Stores the original Italian HTML in dataset.i18nIt on first switch
 * so we can restore it perfectly when going back to IT.
 */
(function () {
  // Each entry: [selector, EN innerHTML]
  // All elements matched by the selector receive the same EN.
  // Use :nth-of-type or more-specific selectors when entries differ per match.
  const HTML = [
    // ---- NAV ----
    ['[data-i18n="nav.how"]',   'How it works'],
    ['[data-i18n="nav.who"]',   'Who it\u2019s for'],
    ['[data-i18n="nav.plans"]', 'Plans &amp; pricing'],
    ['[data-i18n="nav.faq"]',   'FAQ'],
    ['[data-i18n="nav.cta"]',   'Try it now'],

    // ---- HERO ----
    ['.hero .hero-title',
      'Your field logbook<br />in <em>minutes.</em>'],
    ['.hero .hero-subtitle',
      'You review. You approve. <span class="earth">You sign.</span>'],
    ['.hero .hero-sub',
      'Invoices show up on WhatsApp, email, PDF, handwritten notes. Collecting them, cross-checking and formatting them into the logbook takes <strong>hours</strong> \u2014 before the real work even starts. Drop everything into Seminai. In a few minutes you have the logbook ready.'],
    ['.hero .hero-ctas .btn-primary',
      'Upload your invoices<span class="arrow"></span>'],
    ['.hero .hero-ctas .btn-link',
      'Running a cooperative? See the Network plan \u2192'],

    // Demo preview
    ['.demo-bar .demo-url',
      'app.seminai.tech / logbook \u00b7 Tenuta La Sorgente'],
    ['.demo-eyebrow', 'Field Logbook \u00b7 2026'],
    ['.demo-h',       'Tenuta La Sorgente \u2014 South Vineyard'],
    ['.demo-status.ok',
      '<span class="sdot"></span>CAP compliant'],
    ['.demo-row.demo-hd',
      '<span>Date</span><span>Product</span><span>Crop</span><span>Dose</span><span>Status</span>'],
    ['.demo-row:not(.demo-hd):not(.warn) .tag.ok', 'OK'],
    ['.demo-row.warn .tag.warn', 'Anomaly'],
    ['.demo-note span:last-child',
      '<strong>Anomaly 24 Mar</strong> \u2014 dose 3.2 kg/ha exceeds label limit (max 2.5 kg/ha). <em>Reduce to 2.5 kg/ha.</em>'],
    ['.demo-caption', 'Preview \u00b7 reviewable output'],

    // Vineyard rows: month abbreviations + crop
    ['.demo-table .demo-row:nth-child(2) span:nth-child(1)', '12 Mar'],
    ['.demo-table .demo-row:nth-child(3) span:nth-child(1)', '18 Mar'],
    ['.demo-table .demo-row:nth-child(4) span:nth-child(1)', '24 Mar'],
    ['.demo-table .demo-row:nth-child(5) span:nth-child(1)', '02 Apr'],
    ['.demo-table .demo-row:nth-child(6) span:nth-child(1)', '09 Apr'],
    ['.demo-table .demo-row:not(.demo-hd) span:nth-child(3)', 'Grapevine'],

    // ---- TICKER ----
    ['.ticker-track span:not(.sep)', null], // handled by tickerStrings below

    // ---- PROBLEM ----
    ['.problem .eyebrow', '01 \u2014 The Problem'],
    ['.problem .section-head h2',
      'The field logbook isn\u2019t hard. <em><span class="serif-i">It\u2019s slow.</span></em> And the data always lives in the wrong place.'],
    ['.problem .section-head .lead',
      'Client WhatsApp. Supplier email. Paper invoice. Handwritten note. Out-of-date spreadsheet. Collecting it all, cross-checking and formatting it \u2014 before you even start the logbook \u2014 takes hours. Every time. For every farm.'],
    ['.problem-card:nth-child(1) h3', '6 hours lost every week.'],
    ['.problem-card:nth-child(1) p',
      'Just to gather data from different sources and transcribe it into the right format. Hours that don\u2019t bill. Hours you could spend on new clients.'],
    ['.problem-card:nth-child(2) h3', '34% of farms have at least one anomaly.'],
    ['.problem-card:nth-child(2) p',
      'Off-label dosage, treatment not registered on the variety, harvest interval violated. Invisible errors \u2014 until the inspection arrives. At that point, the average CAP deduction is \u20ac4,200 per farm.'],
    ['.problem-card:nth-child(3) h3', '4 regulations to cross-check every time.'],
    ['.problem-card:nth-child(3) p',
      'Product label. National pesticide regulation. Current CAP rules. Region-specific rules. They change every year. Keeping them up to date by hand while producing logbooks is impossible.'],
    ['.problem-bridge p',
      'Seminai solves all three. <em>In minutes.</em> Without taking away the professional responsibility that belongs to you.'],

    // ---- SOLUTION ----
    ['#come-funziona .eyebrow', '02 \u2014 How it works'],
    ['#come-funziona .section-head h2',
      'How Seminai produces the <em>field logbook</em> in minutes.'],
    ['#come-funziona .section-head .lead',
      'Three steps. The first one you do in thirty seconds. The second one is Seminai. The third comes back to you \u2014 because a professional\u2019s signature can\u2019t be delegated.'],
    ['.stepper-node[data-step="1"] .node-label', 'Upload'],
    ['.stepper-node[data-step="2"] .node-label', 'Process'],
    ['.stepper-node[data-step="3"] .node-label', 'Approve'],
    ['.stepper-content .step-block:nth-child(1) .step-block-h',
      'Upload the invoices \u2014 from wherever they live.'],
    ['.stepper-content .step-block:nth-child(1) p',
      'WhatsApp photos, PDF upload, forwarded emails. Pesticides, seeds, fertilizers. <strong>Even messy, even from different sources.</strong> Seminai collects them all.'],
    ['.stepper-content .step-block:nth-child(2) .step-block-h',
      'The system processes and flags.'],
    ['.stepper-content .step-block:nth-child(2) p',
      'Extracts the data, cross-checks dosages with labels, verifies compliance against <strong>4 live regulatory layers</strong>. Every anomaly is flagged with source and corrective action.'],
    ['.stepper-content .step-block:nth-child(3) .step-block-h',
      'You review, approve, deliver.'],
    ['.stepper-content .step-block:nth-child(3) p',
      'In a few minutes you have the logbook ready for review. You check, approve or correct. <strong>You sign</strong> \u2014 the professional responsibility stays where it belongs.'],
    ['.solution-cta-row .btn-primary', 'Try it now<span class="arrow"></span>'],
    ['.solution-cta-row .note', '14 days \u00b7 no credit card'],

    // Sliding doors (dream outcome)
    ['.door-before .door-label', 'Without Seminai'],
    ['.door-after .door-label', 'With Seminai'],
    ['.door-before ul li:nth-child(1)',
      'Sunday 10:30 pm still at the PC closing the logbook.'],
    ['.door-before ul li:nth-child(2)',
      'Client calling you in a panic over a CAP inspection.'],
    ['.door-before ul li:nth-child(3)',
      'You turn down the fifth new studio \u2014 no capacity.'],
    ['.door-after ul li:nth-child(1)',
      'Saturday in the field. Sunday off.'],
    ['.door-after ul li:nth-child(2)',
      'Monday: new client signed without thinking twice.'],
    ['.door-after ul li:nth-child(3)',
      'Wednesday: 30 logbooks reviewed in a morning.'],
    ['.door-after ul li:nth-child(4)',
      'CAP deductions on your clients: zero.'],

    // ---- TRUST ----
    ['#fonti .eyebrow', '03 \u2014 Sources'],
    ['#fonti .section-head h2',
      'What Seminai\u2019s <em>checks</em> are built on.'],
    ['#fonti .section-head .lead',
      'Seminai doesn\u2019t invent rules. It applies them from official sources, updated automatically at every regulatory change.'],
    ['.trust-grid .trust-card:nth-child(1) .trust-num', 'SOURCE 01'],
    ['.trust-grid .trust-card:nth-child(1) h3', 'Product ministerial label.'],
    ['.trust-grid .trust-card:nth-child(2) .trust-num', 'SOURCE 02'],
    ['.trust-grid .trust-card:nth-child(2) h3', 'Technical guidelines'],
    ['.trust-grid .trust-card:nth-child(3) .trust-num', 'SOURCE 03'],
    ['.trust-grid .trust-card:nth-child(3) h3', 'European regulation'],
    ['.trust-grid .trust-card:nth-child(4) .trust-num', 'SOURCE 04'],
    ['.trust-grid .trust-card:nth-child(4) h3', 'Regional bulletins &amp; derogations'],
    ['.trust-foot p',
      'When a rule changes, you get an alert. <em>The next logbook is already compliant.</em> You don\u2019t have to track the updates yourself.'],

    // ---- FORK ----
    ['#cooperative .eyebrow', '04 \u2014 Who it\u2019s for'],
    ['#cooperative .section-head h2',
      'Are you a <em>self-employed</em> agronomist or running a <em>cooperative?</em>'],
    ['#cooperative .section-head .lead',
      'The problem is the same. The scale is different. So are the plans.'],
    ['.fork-card.left .eyebrow', 'Technical studios'],
    ['.fork-card.left h3', 'For agronomists and technical studios.'],
    ['.fork-card.left .intro',
      'You manage 10, 20, 50 farms. The field logbook is the slice of the job that eats the most hours without producing direct revenue.'],
    ['.fork-card.left ul li:nth-child(1)',
      'Logbooks ready for review in <strong>minutes, not hours</strong>.'],
    ['.fork-card.left ul li:nth-child(2)',
      'All the data in one place \u2014 WhatsApp, email, PDF, photo.'],
    ['.fork-card.left ul li:nth-child(3)',
      'Anomalies flagged <strong>before</strong> the inspection, not after.'],
    ['.fork-card.left ul li:nth-child(4)',
      'You review and approve \u2014 the professional responsibility stays with you.'],
    ['.fork-card.left .price-note',
      'Plans from \u20ac297/year (3 farms) to \u20ac3,497/year (80 farms).'],
    ['.fork-card.left .btn-secondary',
      'See plans for agronomists \u2192'],

    ['.fork-card.right .eyebrow', 'Network'],
    ['.fork-card.right h3', 'For cooperatives and farming consortia.'],
    ['.fork-card.right .intro',
      'You don\u2019t have a single-farm problem. You have a systemic one: hundreds of members, each with their own invoices, their own way of working, their own channels.'],
    ['.fork-card.right ul li:nth-child(1)',
      'Compliant logbooks for <strong>every member</strong> in minutes.'],
    ['.fork-card.right ul li:nth-child(2)',
      'Aggregate reports for your technical office.'],
    ['.fork-card.right ul li:nth-child(3)',
      'One control point for all compliance.'],
    ['.fork-card.right ul li:nth-child(4)',
      'API integration with your existing systems.'],
    ['.fork-card.right .price-note',
      'Network plan \u2014 custom pricing for your volume.'],
    ['.fork-card.right .btn-secondary', 'Talk to us \u2192'],

    // ---- PRICING ----
    ['#piani .eyebrow', '05 \u2014 Plans'],
    ['#piani .section-head h2', 'Clear plans. <em>No surprises.</em>'],

    // Founding Member banner
    ['.founding-eyebrow', 'Founding Member 2026'],
    ['.founding-banner h3',
      '\u221230% <em>forever.</em> First 100 studios.'],
    ['.founding-banner p',
      'We\u2019re building the regional regulatory database with the first 100 studios who come on board. In exchange for their feedback: <em>price locked for life.</em> The discount stays at every renewal, as long as the plan exists.'],
    ['.counter-label', 'spots left'],
    ['.founding-tag', 'Founding \u221230%'],
    ['.anchor-card .left p',
      'How much does producing field logbooks cost <em><span class="serif-i">without</span></em> Seminai?'],
    ['.anchor-card .right p',
      '6 hours of manual work per agronomist per week. Across 10 farms, over one season, that\u2019s dozens of hours you can\u2019t bill but can\u2019t skip.<br /><br /><em>Seminai Studio 10: \u20ac697/year.</em> You get every one of those hours back.'],

    // Plan rows
    ['.price-cell:nth-child(1) .plan-sub', '3 farms'],
    ['.price-cell:nth-child(1) .price-old', '\u20ac297<small>/year</small>'],
    ['.price-cell:nth-child(1) .price', '\u20ac207<small>/year</small>'],
    ['.price-cell:nth-child(1) .price-meta',
      '\u20ac17.25/month<span class="pf"><strong>\u20ac5.75</strong> per farm/month</span>'],
    ['.price-cell:nth-child(1) .who',
      'Agronomist with a handful of farms or a single grower.'],

    ['.price-cell.featured .featured-badge', 'Most picked'],
    ['.price-cell.featured .plan-sub', '10 farms'],
    ['.price-cell.featured .price-old', '\u20ac697<small>/year</small>'],
    ['.price-cell.featured .price', '\u20ac487<small>/year</small>'],
    ['.price-cell.featured .price-meta',
      '\u20ac40.58/month<span class="pf"><strong>\u20ac4.06</strong> per farm/month</span>'],
    ['.price-cell.featured .who',
      'Mid-size technical studio. The highest hours-recovered-per-euro ratio.'],

    ['.price-cell:nth-child(3) .plan-sub', '30 farms'],
    ['.price-cell:nth-child(3) .price-old', '\u20ac1,497<small>/year</small>'],
    ['.price-cell:nth-child(3) .price', '\u20ac1,047<small>/year</small>'],
    ['.price-cell:nth-child(3) .price-meta',
      '\u20ac87.25/month<span class="pf"><strong>\u20ac2.91</strong> per farm/month</span>'],
    ['.price-cell:nth-child(3) .who',
      'Structured studio with a team of technicians.'],

    ['.price-cell:nth-child(4) .plan-sub', '80 farms'],
    ['.price-cell:nth-child(4) .price-old', '\u20ac3,497<small>/year</small>'],
    ['.price-cell:nth-child(4) .price', '\u20ac2,447<small>/year</small>'],
    ['.price-cell:nth-child(4) .price-meta',
      '\u20ac203.92/month<span class="pf"><strong>\u20ac2.55</strong> per farm/month</span>'],
    ['.price-cell:nth-child(4) .who', 'Large studio or small consortium.'],

    ['.price-cell.network .plan-sub', '80+ farms'],
    ['.price-cell.network .price',
      'Custom quote \u2014 bespoke pricing'],
    ['.price-cell.network .who',
      'Cooperatives and consortia. API, SSO, dedicated technical office.'],

    // All "Inizia →" buttons (Solo / Studio 10/30/80)
    ['.price-cell:not(.network) .pick', 'Start \u2192'],
    ['.price-cell.network .pick', 'Talk to us \u2192'],

    ['.price-features h4', 'Included in every plan'],
    ['.price-features ul li:nth-child(1)', 'Field logbooks for your farms.'],
    ['.price-features ul li:nth-child(2)',
      'Automatic OCR \u2014 WhatsApp photos or PDF upload.'],
    ['.price-features ul li:nth-child(3)',
      'Compliance check across 4 official regulatory layers.'],
    ['.price-features ul li:nth-child(4)',
      'Anomalies flagged with source and a specific fix.'],
    ['.price-features ul li:nth-child(5)',
      'Automatic alerts on regulatory updates.'],
    ['.price-features ul li:nth-child(6)',
      'Direct WhatsApp and Telegram support.'],
    ['.price-features ul li:nth-child(7)',
      'PDF logbook export, ready for CAP inspections.'],
    ['.price-features ul li:nth-child(8)', 'European servers \u2014 encrypted data.'],

    // ---- MAGNET ----
    ['#trial .eyebrow', '06 \u2014 Free trial'],
    ['#trial .magnet-grid h2',
      'Not ready for the trial yet? <em>Send us your invoices.</em> We\u2019ll send back the clean spreadsheet. <em>Free.</em>'],
    ['#trial .magnet-cta .btn-primary',
      'Upload your invoices<span class="arrow"></span>'],
    ['#trial .magnet-cta .note',
      'Available for the first 5 new leads each month.'],

    // Chat mock
    ['.chat-mock .chat-status',
      'Seminai \u00b7 online \u00b7 replies in a few minutes'],
    ['.chat-mock .chat-date', 'today \u00b7 09:42'],
    ['.chat-mock .bubble.out:not(.photo)',
      'Hi! Sending this morning\u2019s invoice \u2014 pesticides for the vineyard.<div class="meta">09:42 <span class="ticks">\u2713\u2713</span></div>'],
    ['.chat-mock .invoice .inv-brand', 'Agrifornitura Rossi srl'],
    ['.chat-mock .invoice .inv-num', 'No. 1284/2026'],
    ['.chat-mock .invoice .inv-title', 'Invoice \u2014 05/14/2026'],
    ['.chat-mock .bubble.in',
      'Got it \ud83d\udc4d Extracting the products and updating the logbook for Antonio\u2019s vineyard.<div class="meta">09:43</div>'],
    ['.chat-mock .chat-input', 'Type a message\u2026'],

    // ---- FAQ ----
    ['#faq .eyebrow', '07 \u2014 FAQ'],
    ['#faq h2', 'Frequently asked questions about the digital field logbook.'],

    ['#faq details:nth-child(1) summary',
      'What is the field logbook and what is it for?<span class="plus"></span>'],
    ['#faq details:nth-child(1) .answer',
      'The field logbook is the document every farm is required by law to keep, recording all pesticide treatments \u2014 products used, dosages, dates, treated crops. It is required by CAP regulation, by Italian Legislative Decree 150/2012 and by specific regional rules. During an inspection, a missing or irregular logbook can lead to CAP payment deductions.'],

    ['#faq details:nth-child(2) summary',
      'How long does it take to produce a logbook with Seminai?<span class="plus"></span>'],
    ['#faq details:nth-child(2) .answer',
      'A few minutes from when the invoices land. Without Seminai, an agronomist spends an average of 4\u20136 hours gathering data from different sources and producing the logbook by hand.'],

    ['#faq details:nth-child(3) summary',
      'Who approves the logbook Seminai produces?<span class="plus"></span>'],
    ['#faq details:nth-child(3) .answer',
      'You do \u2014 the agronomist or technical lead. Seminai produces the logbook and flags anomalies with specific fixes. You review, approve and sign. The professional responsibility stays with the professional, where the law requires it.'],

    ['#faq details:nth-child(4) summary',
      'How are the regulations verified?<span class="plus"></span>'],
    ['#faq details:nth-child(4) .answer',
      'Seminai cross-checks every treatment against 4 layers, refreshed automatically: <ol><li>The product\u2019s ministerial label.</li><li>Legislative Decree 150/2012 and amendments.</li><li>Current CAP regulation for the season.</li><li>The official bulletin of the farm\u2019s region.</li></ol>If a treatment violates any one of the 4 layers, it\u2019s flagged with the specific source and the recommended corrective action.'],

    ['#faq details:nth-child(5) summary',
      'How does invoice OCR work?<span class="plus"></span>'],
    ['#faq details:nth-child(5) .answer',
      'Send invoice photos on WhatsApp or upload PDFs. The platform automatically extracts: date, supplier, commercial product, active ingredient, quantity purchased, batch number, unit price. The extracted data is matched against your farm records to produce the logbook.'],

    ['#faq details:nth-child(6) summary',
      'What happens when regulations change?<span class="plus"></span>'],
    ['#faq details:nth-child(6) .answer',
      'Seminai updates the regulatory databases automatically at every change \u2014 CAP, national rules, regional rules. You get an alert when a change impacts the farms you manage. The next logbook is already compliant without you doing anything.'],

    ['#faq details:nth-child(7) summary',
      'Is my farms\u2019 data safe?<span class="plus"></span>'],
    ['#faq details:nth-child(7) .answer',
      'Data is encrypted in transit and at rest. We don\u2019t share it with third parties and don\u2019t use it to train AI models. You can export or delete all your data at any time. Infrastructure on European servers (Hetzner, Germany).'],

    ['#faq details:nth-child(8) summary',
      'Does it cover every Italian region?<span class="plus"></span>'],
    ['#faq details:nth-child(8) .answer',
      'Yes. Seminai covers the regional rules of all 20 Italian regions. Rules are updated automatically at every change published in the regional official bulletins.'],

    ['#faq details:nth-child(9) summary',
      'Can I integrate Seminai with the software I already use?<span class="plus"></span>'],
    ['#faq details:nth-child(9) .answer',
      'Yes. Seminai offers open, documented APIs to integrate with existing ERPs, accounting software and cooperative management systems. Get in touch for a free technical assessment.'],

    ['#faq details:nth-child(10) summary',
      'How does the 14-day free trial work?<span class="plus"></span>'],
    ['#faq details:nth-child(10) .answer',
      'Access the platform with no credit card. You can load up to 2 trial farms with real data. After 14 days, the account goes read-only \u2014 your data stays available, nothing is deleted. No automatic billing. No obligation to convert.'],

    // ---- FOOTER ----
    ['.foot-brand p',
      'The digital field logbook for agronomists, technical studios and farming cooperatives. Compliant with CAP, Italian Legislative Decree 150/2012 and regional rules.'],
    ['.foot-col:nth-child(2) h5', 'Product'],
    ['.foot-col:nth-child(2) li:nth-child(1) a', 'How it works'],
    ['.foot-col:nth-child(2) li:nth-child(2) a', 'Regulatory sources'],
    ['.foot-col:nth-child(2) li:nth-child(3) a', 'Plans &amp; pricing'],
    ['.foot-col:nth-child(2) li:nth-child(4) a', 'For cooperatives'],
    ['.foot-col:nth-child(2) li:nth-child(5) a', 'FAQ'],
    ['.foot-col:nth-child(3) h5', 'Contact'],
    ['.foot-col:nth-child(3) li:nth-child(3) a', '14-day trial'],
    ['.foot-col:nth-child(4) h5', 'Legal'],
    ['.foot-col:nth-child(4) li:nth-child(1) a', 'Privacy Policy'],
    ['.foot-col:nth-child(4) li:nth-child(2) a', 'Cookie Policy'],
    ['.foot-col:nth-child(4) li:nth-child(3) a', 'Terms of service'],
    ['.foot-bottom span:nth-child(2)', 'European servers \u00b7 Hetzner DE'],
  ];

  // Ticker strings — special-cased so we can rebuild the looping marquee.
  const tickerStrings = {
    it: ['Conforme PAC', 'D.Lgs. 150/2012', 'Bollettini regionali \u2014 20 regioni',
         'OCR fatture WhatsApp \u00b7 PDF \u00b7 email', 'Anomalie segnalate con fonte',
         'Server europei \u2014 Hetzner DE'],
    en: ['CAP compliant', 'It. Leg. Decree 150/2012', 'Regional bulletins \u2014 20 regions',
         'OCR for invoices \u2014 WhatsApp \u00b7 PDF \u00b7 email', 'Anomalies flagged with source',
         'European servers \u2014 Hetzner DE'],
  };

  // Document-level (title)
  const TITLE = {
    it: 'Quaderno di Campagna Digitale \u2014 Automatico in Minuti | Seminai',
    en: 'Digital Field Logbook \u2014 Automatic in Minutes | Seminai',
  };

  function applyTicker(lang) {
    const track = document.querySelector('.ticker-track');
    if (!track) return;
    const strings = tickerStrings[lang];
    // Two passes for the seamless loop
    const html = [0, 1].map(() => strings.map(s =>
      `<span>${s}</span><span class="sep">\u2726</span>`
    ).join('')).join('');
    track.innerHTML = html;
  }

  function applyLang(lang) {
    HTML.forEach(([selector, en]) => {
      if (en === null) return; // ticker placeholder, handled separately
      document.querySelectorAll(selector).forEach(el => {
        if (!('i18nIt' in el.dataset)) {
          el.dataset.i18nIt = el.innerHTML;
        }
        el.innerHTML = lang === 'en' ? en : el.dataset.i18nIt;
      });
    });
    applyTicker(lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'it';
    document.title = TITLE[lang] || TITLE.it;

    // Update toggle buttons
    document.querySelectorAll('.lang-toggle button').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
    });

    try { localStorage.setItem('seminai-lang', lang); } catch (e) {}
  }

  function init() {
    let saved = 'it';
    try { saved = localStorage.getItem('seminai-lang') || 'it'; } catch (e) {}

    document.querySelectorAll('.lang-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        applyLang(btn.dataset.lang);
      });
    });

    if (saved === 'en') applyLang('en');
    else applyLang('it'); // ensures ticker rebuild + button state
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
