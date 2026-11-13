/* Bazaar Khabar - data logic (bazaar_update.py ka JavaScript port).
   Network sirf CapacitorHttp se: Yahoo Finance, TradingView, Google News aur khabar ke pages. */
(function (root) {
  'use strict';
  const UA = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
  const NEWS_COUNT = 5;
  const TRUSTED = ['economic times', 'moneycontrol', 'mint', 'business standard', 'hindustan times', 'the hindu',
    'businessline', 'cnbc', 'ndtv', 'financial express', 'times of india', 'zee business', 'reuters', 'bloomberg', 'bbc',
    'india today', 'indian express', 'news18', 'wsj', 'wall street journal', 'financial times', 'associated press',
    'al jazeera', 'guardian', 'forbes', 'barron', 'marketwatch', 'pti', 'ani news'];
  const YAHOO = {
    india: [['Sensex', '^BSESN', 'in'], ['Nifty 50', '^NSEI', 'in'], ['Bank Nifty', '^NSEBANK', 'in'], ['India VIX', '^INDIAVIX', 'plain']],
    us: [['Dow Jones', '^DJI', 'plain'], ['S&P 500', '^GSPC', 'plain'], ['Nasdaq', '^IXIC', 'plain'], ['US VIX', '^VIX', 'plain']],
    eu: [['FTSE 100', '^FTSE', 'plain'], ['Euro Stoxx 50', '^STOXX50E', 'plain'], ['DAX', '^GDAXI', 'plain']],
    asia: [['Nikkei 225', '^N225', 'plain'], ['KOSPI', '^KS11', 'plain'], ['Hang Seng', '^HSI', 'plain']],
    macro: [['Brent crude', 'BZ=F', '$'], ['WTI crude', 'CL=F', '$'], ['Sona', 'GC=F', '$/oz'], ['Chandi', 'SI=F', '$/oz'],
      ['USD/INR', 'INR=X', '₹'], ['US Dollar Index', 'DX-Y.NYB', 'plain'], ['US 10Y yield', '^TNX', 'yield']],
  };
  const FUTURES = {
    inFut: [['Gift Nifty', 'NSEIX:NIFTY1!']],
    usFut: [['S&P 500 fut', 'CME_MINI:ES1!'], ['Nasdaq fut', 'CME_MINI:NQ1!'], ['Dow fut', 'CBOT_MINI:YM1!']],
    euFut: [['Euro Stoxx 50 fut', 'EUREX:FESX1!'], ['DAX fut', 'EUREX:FDAX1!']],
    asiaFut: [['Nikkei fut', 'CME:NKD1!'], ['Hang Seng fut', 'HKEX:HSI1!']],
  };
  const STOCKS = {
    RELIANCE: 'Reliance Industries', TCS: 'TCS', HDFCBANK: 'HDFC Bank', ICICIBANK: 'ICICI Bank', INFY: 'Infosys',
    BHARTIARTL: 'Bharti Airtel', ITC: 'ITC', SBIN: 'SBI', LT: 'Larsen & Toubro', HINDUNILVR: 'Hindustan Unilever',
    KOTAKBANK: 'Kotak Mahindra Bank', AXISBANK: 'Axis Bank', BAJFINANCE: 'Bajaj Finance', MARUTI: 'Maruti Suzuki',
    SUNPHARMA: 'Sun Pharma', 'M&M': 'Mahindra & Mahindra', HCLTECH: 'HCL Tech', NTPC: 'NTPC', TITAN: 'Titan',
    ULTRACEMCO: 'UltraTech Cement', ASIANPAINT: 'Asian Paints', POWERGRID: 'Power Grid', ONGC: 'ONGC',
    TATASTEEL: 'Tata Steel', JSWSTEEL: 'JSW Steel', ADANIENT: 'Adani Enterprises', ADANIPORTS: 'Adani Ports',
    COALINDIA: 'Coal India', BAJAJFINSV: 'Bajaj Finserv', NESTLEIND: 'Nestle India', WIPRO: 'Wipro', TECHM: 'Tech Mahindra',
    HINDALCO: 'Hindalco', GRASIM: 'Grasim', CIPLA: 'Cipla', DRREDDY: 'Dr Reddys', EICHERMOT: 'Eicher Motors', BPCL: 'BPCL',
    TATACONSUM: 'Tata Consumer', APOLLOHOSP: 'Apollo Hospitals', BRITANNIA: 'Britannia', INDUSINDBK: 'IndusInd Bank',
    SBILIFE: 'SBI Life', HDFCLIFE: 'HDFC Life', SHRIRAMFIN: 'Shriram Finance', TRENT: 'Trent', BEL: 'Bharat Electronics',
    ETERNAL: 'Eternal', INDIGO: 'InterGlobe Aviation', JIOFIN: 'Jio Financial',
  };

  // ---------- network (sirf CapacitorHttp; ek saath 8 se zyada request nahi) ----------
  let httpImpl = null;            // tests yahan nakli http daalte hain
  let active = 0; const waiting = [];
  const slot = () => new Promise(res => { if (active < 8) { active++; res(); } else waiting.push(res); });
  const release = () => { const n = waiting.shift(); if (n) n(); else active--; };
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  async function rawReq(o) {      // o: {url, method, headers, data}
    if (httpImpl) return httpImpl(o);
    const CH = root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins.CapacitorHttp;
    if (!CH) throw new Error('CapacitorHttp nahi mila (app ke andar chalayein)');
    const r = await CH.request({ url: o.url, method: o.method || 'GET', headers: Object.assign({ 'User-Agent': UA }, o.headers || {}),
      data: o.data, connectTimeout: 15000, readTimeout: 20000, responseType: 'text' });
    if (r.status >= 400) throw new Error('HTTP ' + r.status);
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  }
  async function req(o, ms) {
    await slot();
    try { return await withTimeout(rawReq(o), ms || 20000); } finally { release(); }
  }
  async function getJson(url, tries) {
    let last;
    for (let i = 0; i < (tries || 2); i++) {
      try { return JSON.parse(await req({ url })); } catch (e) { last = e; await new Promise(r => setTimeout(r, 1000 * (i + 1))); }
    }
    throw last;
  }
  async function pool(items, n, fn) {
    const out = new Array(items.length); let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = undefined; } }
    }));
    return out;
  }

  // ---------- helpers ----------
  const istNow = () => new Date(Date.now() + 330 * 60000);
  const stockHours = () => ([6, 0, 1].includes(istNow().getUTCDay()) ? 72 : 24);   // Sat/Sun/Mon
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p2 = n => String(n).padStart(2, '0');
  function istLabel() {
    const d = istNow(); let h = d.getUTCHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${p2(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p2(h)}:${p2(d.getUTCMinutes())} ${ap} IST`.replace(/^0/, '');
  }
  const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '#');
  function fmtIn(n, dec) {
    dec = dec == null ? 2 : dec;
    let [whole, frac] = Math.abs(n).toFixed(dec).split('.');
    if (whole.length > 3) {
      let head = whole.slice(0, -3); const tail = whole.slice(-3), parts = [];
      while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
      if (head) parts.unshift(head);
      whole = parts.concat(tail).join(',');
    }
    return (n < 0 ? '-' : '') + whole + '.' + frac;
  }
  const comma = (n, d) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  const signed = (n, d) => (n < 0 ? '-' : '+') + comma(n, d);

  function tile(name, price, prev, fmt, basis, date, chg, pct) {
    if (price == null) return { name, level: 'nahi mila', chg: '', pct: '', dir: 'flat', basis: basis || 'data nahi mila', old: true };
    if (chg == null) { chg = price - prev; pct = prev ? chg / prev * 100 : 0; }
    const dir = chg > 0.005 ? 'up' : chg < -0.005 ? 'down' : 'flat';
    let lvl = fmt === 'in' ? fmtIn(price) : fmt === 'yield' ? price.toFixed(3) + '%' : (price < 0 ? '-' : '') + comma(price);
    if (fmt === '$' || fmt === '$/oz') lvl = '$' + lvl + (fmt === '$/oz' ? ' /oz' : '');
    if (fmt === '₹') lvl = '₹' + lvl;
    const c = fmt === 'yield' ? (chg * 100 >= 0 ? '+' : '-') + Math.abs(chg * 100).toFixed(1) + ' bps' : signed(chg);
    const old = !!(date && (Date.now() - date.getTime()) / 86400000 > 3);
    return { name, level: lvl, chg: c, pct: (pct >= 0 ? '+' : '-') + Math.abs(pct).toFixed(2) + '%', dir, basis, old, raw: price };
  }

  // ---------- Yahoo / TradingView ----------
  async function yahooRows(sym) {
    const q = encodeURIComponent(sym); let last;
    for (const host of ['query1', 'query2']) {
      try {
        const j = await getJson(`https://${host}.finance.yahoo.com/v8/finance/chart/${q}?range=10d&interval=1d`, 2);
        const r = j.chart.result[0], cl = r.indicators.quote[0].close, rows = [];
        r.timestamp.forEach((t, i) => { if (cl[i] != null) rows.push([new Date(t * 1000), Number(cl[i])]); });
        if (rows.length >= 2) return rows;
        last = new Error('kam data mila');
      } catch (e) { last = e; }
    }
    throw last;
  }
  async function yahooTile(name, sym, fmt) {
    const rows = await yahooRows(sym), a = rows[rows.length - 1], b = rows[rows.length - 2];
    const d = new Date(a[0].getTime() + 330 * 60000);
    return tile(name, a[1], b[1], fmt, `${p2(d.getUTCDate())} ${MON[d.getUTCMonth()]}, last price/close`, a[0]);
  }
  async function tvQuotes(tickers) {
    const body = { symbols: { tickers }, columns: ['close', 'change', 'change_abs'] };
    let last;
    for (const market of ['futures', 'global']) {
      try {
        const j = JSON.parse(await req({ url: `https://scanner.tradingview.com/${market}/scan`, method: 'POST',
          headers: { 'Content-Type': 'application/json' }, data: body }));
        const out = {};
        (j.data || []).forEach(x => { if (x.d && x.d[0] != null) out[x.s] = x.d; });
        if (Object.keys(out).length) return out;
      } catch (e) { last = e; }
    }
    throw last || new Error('koi data nahi aaya');
  }
  async function buildGroups(log) {
    const g = {};
    for (const key of Object.keys(YAHOO)) g[key] = new Array(YAHOO[key].length);
    const jobs = [];
    Object.keys(YAHOO).forEach(key => YAHOO[key].forEach(([name, sym, fmt], i) => jobs.push(async () => {
      try { g[key][i] = await yahooTile(name, sym, fmt); log('ok   ' + name); }
      catch (e) { g[key][i] = tile(name, null, null, fmt, 'fetch nahi hua'); log('FAIL ' + name + ': ' + e.message); }
    })));
    let q = {};
    jobs.push(async () => {
      try { q = await tvQuotes(Object.values(FUTURES).flat().map(x => x[1])); }
      catch (e) { log('FAIL futures (TradingView): ' + e.message); }
    });
    await Promise.all(jobs.map(f => f()));
    for (const key of Object.keys(FUTURES)) {
      g[key] = FUTURES[key].map(([name, t]) => {
        const d = q[t];
        return d ? tile(name, d[0], null, 'plain', 'futures, live/near-live', null, d[2], d[1]) : tile(name, null, null, 'plain', 'source se nahi mila');
      });
    }
    const gift = g.inFut.find(x => x.name === 'Gift Nifty' && 'raw' in x), nifty = g.india.find(x => x.name === 'Nifty 50' && 'raw' in x);
    if (gift && nifty) {
      const diff = gift.raw - nifty.raw;
      g.inFut.push({ name: 'Nifty se fark', level: (diff >= 0 ? '+' : '-') + comma(diff, 1) + ' pts', chg: '',
        pct: (diff >= 0 ? '+' : '-') + Math.abs(diff / nifty.raw * 100).toFixed(2) + '%', dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
        basis: 'Gift Nifty minus Nifty 50 ka last level', old: false });
    }
    return g;
  }

  // ---------- news ----------
  const REF = {};
  const NUM_RE = /(\d{1,3}(?:,\d{3})+|\d{5,6})(?:\.\d+)?\s*(crore|cr|lakh|billion|bn|million|mn|trillion)?/gi;
  const QUOTE_PAGE = /(share|stock) price (today|live)|live nse|nse\/bse updates/i;
  function looksStale(title) {
    const refs = Object.values(REF);
    if (!refs.length || !/sensex|nifty/i.test(title)) return false;
    for (const m of title.matchAll(NUM_RE)) {
      if (m[2]) continue;
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (n < 10000) continue;
      if (!refs.some(r => Math.abs(n - r) / r < 0.07)) return true;
    }
    return false;
  }
  const agoTxt = dt => { const m = Math.floor((Date.now() - dt.getTime()) / 60000); return m < 2 ? 'abhi abhi' : m < 60 ? `${m} min pehle` : `${Math.floor(m / 60)} ghante pehle`; };
  const unescapeHtml = s => { try { return new DOMParser().parseFromString(s, 'text/html').documentElement.textContent; } catch (e) { return s; } };
  function cleanTitle(t) {
    t = unescapeHtml(t.replace(/\s+/g, ' ')).trim();
    const m = t.match(/^(.*\S)\s+[|\u2013\u2014-]\s+([^|\u2013\u2014-]{2,40})$/);
    return m && m[1].length > 25 ? m[1].trim() : t;
  }
  async function gnDecode(link) {
    const gid = new URL(link).pathname.replace(/\/+$/, '').split('/').pop();
    const page = await req({ url: 'https://news.google.com/rss/articles/' + gid }, 12000);
    const sg = page.match(/data-n-a-sg="([^"]+)"/), ts = page.match(/data-n-a-ts="([^"]+)"/);
    if (!sg || !ts) return null;
    const inner = JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
      'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], gid, ts[1], sg[1]]);
    const freq = JSON.stringify([[['Fbv4je', inner, null, 'generic']]]);
    const body = await req({ url: 'https://news.google.com/_/DotsSplashUi/data/batchexecute', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, data: { 'f.req': freq } }, 12000);
    const data = JSON.parse(body.split('\n\n')[1]).slice(0, -2);
    const url = JSON.parse(data[0][2])[1];
    return /^https?:/.test(url) ? url : null;
  }
  async function pageInfo(url) {
    const txt = (await req({ url }, 12000)).slice(0, 400000), metas = {};
    for (const tag of txt.match(/<meta\s[^>]*>/gi) || []) {
      const a = {}; for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[m[1].toLowerCase()] = m[2] != null ? m[2] : m[3];
      const key = (a.property || a.name || a.itemprop || '').toLowerCase();
      if (key && a.content && !(key in metas)) metas[key] = a.content;
    }
    let title = metas['og:title'] || metas['twitter:title'];
    if (!title) { const m = txt.match(/<title[^>]*>([\s\S]*?)<\/title>/i); title = m ? m[1] : null; }
    let dt = null;
    for (const k of ['article:published_time', 'og:article:published_time', 'datepublished', 'pubdate']) {
      if (metas[k]) { const d = new Date(metas[k].trim()); if (!isNaN(d)) { dt = d; break; } }
    }
    return [title ? cleanTitle(title) : null, dt];
  }
  async function enrich(item, hours) {
    try {
      const url = await gnDecode(item.link);
      if (!url) return item;
      item.link = url;
      const [title, dt] = await pageInfo(url);
      if (dt && Date.now() - dt.getTime() > hours * 3600000) return null;
      if (title && title.length > 15) item.title = title;
    } catch (e) { /* RSS ki jodi rehne do */ }
    return item;
  }
  async function parseNews(xml, count, must, hours) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml'), items = [], seen = new Set();
    for (const it of Array.from(doc.getElementsByTagName('item'))) {
      const txt = n => { const e = it.getElementsByTagName(n)[0]; return e ? (e.textContent || '').trim() : ''; };
      let title = txt('title'); const src = txt('source'), dt = new Date(txt('pubDate'));
      if (isNaN(dt) || !title || Date.now() - dt.getTime() > hours * 3600000) continue;
      if (src && title.endsWith(' - ' + src)) title = title.slice(0, -src.length - 3);
      if (!TRUSTED.some(t => src.toLowerCase().includes(t))) continue;
      if (looksStale(title) || QUOTE_PAGE.test(title) || (must && !must(title))) continue;
      const key = title.toLowerCase().replace(/\W+/g, '').slice(0, 45);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ tag: src, title, when: agoTxt(dt), ts: dt.getTime() / 1000, link: txt('link'), _dt: dt });
    }
    items.sort((a, b) => b._dt - a._dt);
    let out = (await Promise.all(items.slice(0, count * 2).map(x => enrich(x, hours)))).filter(Boolean);
    out = out.filter(x => !looksStale(x.title) && (!must || must(x.title)));
    out.forEach(x => delete x._dt);
    return out.slice(0, count);
  }
  async function fetchNews(query, count, must, hours) {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(`${query} when:${Math.floor(hours / 24)}d`) + '&hl=en-IN&gl=IN&ceid=IN:en';
    return parseNews(await req({ url }), count, must, hours);
  }
  async function safeNews(q, log, count, must, hours) {
    try { return await fetchNews(q, count || NEWS_COUNT, must, hours || 24); } catch (e) { log(`FAIL news (${q}): ${e.message}`); return []; }
  }
  async function multiNews(queries, log, count) {
    const lists = await Promise.all(queries.map(q => safeNews(q, log, count, null, 24)));
    const seen = new Set(), got = [];
    lists.flat().forEach(x => { if (!seen.has(x.link)) { seen.add(x.link); got.push(x); } });
    got.sort((a, b) => b.ts - a.ts);
    return got.slice(0, count);
  }

  // ---------- hot stocks ----------
  async function hotStocks(log) {
    const syms = Object.keys(STOCKS);
    const res = await pool(syms, 6, async s => { const c = await yahooRows(s + '.NS'); const a = c[c.length - 1][1], b = c[c.length - 2][1]; return [s, a, (a / b - 1) * 100]; });
    const rows = res.filter(Boolean);
    if (rows.length < 10) { log('FAIL hot stocks: kam symbols chale'); return [[], []]; }
    rows.sort((a, b) => b[2] - a[2]);
    const pick10 = rows.slice(0, 5).concat(rows.slice(-5).reverse());
    const hours = stockHours();
    const found = await pool(pick10, 5, async ([s]) => {
      const name = STOCKS[s], key = name.split(' ')[0].toLowerCase().replace(/^&+|&+$/g, '');
      const must = t => t.toLowerCase().includes(key) || t.toLowerCase().includes(s.toLowerCase());
      const out = [];
      for (const q of [`${name} share`, `${name} stock news`, `${name} results OR target price OR brokerage`]) {
        (await safeNews(q, log, 4, must, hours)).forEach(x => { if (!out.some(f => f.link === x.link)) out.push(x); });
        if (out.length) break;
      }
      return out;
    });
    const USED = new Set();
    const pack = ([s, p, pc], i) => {
      const list = found[i] || [], fresh = list.filter(x => !USED.has(x.link)), pick = (fresh[0] || list[0]) || null;
      let note, link, when = '';
      if (pick) { USED.add(pick.link); note = pick.title; link = pick.link; when = pick.when; }
      else { note = `${STOCKS[s]} ki taaza khabrein dekhein`; link = 'https://news.google.com/search?q=' + encodeURIComponent(STOCKS[s] + ' share') + '&hl=en-IN&gl=IN&ceid=IN:en'; log('WARN ' + STOCKS[s] + ': seedhi khabar nahi mili'); }
      return { name: STOCKS[s], sym: s, price: '₹' + fmtIn(p), pct: (pc >= 0 ? '+' : '-') + Math.abs(pc).toFixed(2) + '%', dir: pc >= 0 ? 'up' : 'down', note, link, when };
    };
    return [pick10.slice(0, 5).map((r, i) => pack(r, i)), pick10.slice(5).map((r, i) => pack(r, i + 5))];
  }

  // ---------- page ----------
  async function buildData(onProgress) {
    const log = m => { try { onProgress && onProgress(m); } catch (e) { /* */ } };
    log('Index aur futures la raha hoon...');
    const groups = await buildGroups(log);
    Object.keys(REF).forEach(k => delete REF[k]);
    groups.india.forEach(t => { if ('raw' in t && !t.old && ['Sensex', 'Nifty 50', 'Bank Nifty'].includes(t.name)) REF[t.name] = t.raw; });
    log('Khabrein aur hot stocks la raha hoon (thoda waqt lagega)...');
    const [[bull, bear], ni, nw0] = await Promise.all([
      hotStocks(log),
      safeNews('Sensex Nifty stock market India', log, NEWS_COUNT, null, 24),
      multiNews(['Wall Street stocks', 'Asian markets stocks', 'global markets Fed oil prices', 'crude oil gold prices', 'Europe stocks FTSE DAX'], log, NEWS_COUNT),
    ]);
    const seen = new Set(ni.map(x => x.link)), nw = nw0.filter(x => !seen.has(x.link));
    const src = [{ t: 'Yahoo Finance: index, VIX, commodity, yield', u: 'https://finance.yahoo.com/' },
      { t: 'TradingView: futures aur Gift Nifty', u: 'https://www.tradingview.com/' }]
      .concat(ni.concat(nw).filter(n => n.link.startsWith('https://')).map(n => ({ t: `${n.tag}: ${n.title}`.slice(0, 90), u: n.link })));
    const data = { asOf: new Date().toISOString(), asOfLabel: istLabel(), groups, bull, bear, newsIndia: ni, newsWorld: nw, sources: src };
    data.bull.concat(data.bear, data.newsIndia, data.newsWorld).forEach(x => { x.link = safeUrl(x.link); });
    data.sources.forEach(s => { s.u = safeUrl(s.u); });
    return data;
  }
  function inject(html, data) {
    const js = ('const EMBED = ' + JSON.stringify(data, null, 1) + ';').replace(/<\//g, '<\\/');
    const re = /const EMBED = \{[\s\S]*?\n\};/;
    if (!re.test(html)) throw new Error("Template mein 'const EMBED = {...};' nahi mila.");
    return html.replace(re, () => js);
  }

  root.BK = { buildData, inject, safeUrl, fmtIn, tile, looksStale, REF, _setHttp: f => { httpImpl = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
