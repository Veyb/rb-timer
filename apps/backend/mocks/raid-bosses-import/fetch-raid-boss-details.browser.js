// Run this in your own browser, not with node/curl.
//
// Why: https://lu4-wiki.hatemosphe.re is behind a Cloudflare managed JS challenge, so plain
// scripted requests (curl, server-side fetch) get a 403 "Just a moment..." page instead of
// JSON. Your browser already holds a valid clearance cookie for this domain (you fetched pages
// there before), so running this from its own DevTools console reuses that same session.
//
// How to run:
//   1. In your normal browser, open any page on https://lu4-wiki.hatemosphe.re (e.g. one of the
//      npc/search URLs you already opened before).
//   2. Open DevTools (Cmd+Option+J on Mac) -> Console tab.
//   3. Paste this whole file and press Enter. If Chrome shows a "allow pasting" warning, type
//      `allow pasting` first as it asks, then paste again.
//   4. Wait — it fetches all 151 ids one at a time with a small delay between each (roughly
//      2-3 minutes total) and logs progress every 10 ids.
//   5. When done, it downloads ONE file: raid-boss-details.json (an object of
//      { [id]: <api response> } for every id that succeeded), and logs any ids that failed
//      after retrying.
//   6. Send me the downloaded raid-boss-details.json (or its path) — see
//      ./raid-boss-details/raid-boss-details.json and ./raid-boss-details.ts for what came of
//      the first run.
//
// If the download doesn't trigger (e.g. blocked by a popup/download setting), the results are
// also left on `window.__npcDetails` — run `copy(JSON.stringify(window.__npcDetails))` in the
// console to copy the whole thing to your clipboard instead, then paste it into a file for me.

(async () => {
  const ids = [
    25001, 25004, 25007, 25010, 25016, 25019, 25020, 25023, 25026, 25029, 25032, 25035, 25038,
    25041, 25051, 25057, 25060, 25063, 25064, 25067, 25070, 25073, 25076, 25079, 25082, 25085,
    25088, 25089, 25092, 25095, 25098, 25099, 25102, 25103, 25106, 25109, 25112, 25115, 25118,
    25119, 25122, 25125, 25128, 25131, 25134, 25137, 25140, 25146, 25149, 25152, 25155, 25158,
    25159, 25162, 25163, 25166, 25169, 25170, 25173, 25176, 25179, 25182, 25185, 25188, 25189,
    25192, 25198, 25199, 25202, 25208, 25211, 25214, 25217, 25220, 25223, 25226, 25230, 25233,
    25234, 25235, 25238, 25241, 25248, 25252, 25255, 25256, 25259, 25260, 25263, 25269, 25272,
    25273, 25281, 25322, 25352, 25354, 25357, 25360, 25362, 25365, 25366, 25369, 25372, 25373,
    25375, 25378, 25380, 25383, 25385, 25388, 25391, 25392, 25394, 25395, 25398, 25401, 25404,
    25407, 25410, 25412, 25415, 25418, 25420, 25423, 25426, 25429, 25431, 25434, 25437, 25438,
    25441, 25444, 25447, 25453, 25456, 25460, 25463, 25467, 25470, 25478, 25481, 25484, 25487,
    25490, 25493, 25496, 25498, 25501, 25504, 25506, 25524,
  ];

  const BASE = 'https://lu4-wiki.hatemosphe.re/api/npc';
  const SERVER = 'lu4-b-w-c';
  const MIN_DELAY_MS = 400;
  const MAX_DELAY_MS = 900;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = () => MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

  async function fetchOne(id) {
    const url = `${BASE}/${id}?server=${SERVER}&v=${encodeURIComponent(new Date().toISOString())}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

  const results = {};
  const failed = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      results[id] = await fetchOne(id);
    } catch (_err) {
      await sleep(2000);
      try {
        results[id] = await fetchOne(id);
      } catch (err2) {
        console.warn(`[${i + 1}/${ids.length}] id ${id} failed twice:`, err2.message || err2);
        failed.push(id);
      }
    }
    if ((i + 1) % 10 === 0 || i === ids.length - 1) {
      console.info(`[${i + 1}/${ids.length}] fetched so far, ${failed.length} failed`);
    }
    await sleep(jitter());
  }

  window.__npcDetails = results;
  console.info(`Done. ${Object.keys(results).length} succeeded, ${failed.length} failed.`);
  if (failed.length) {
    console.info('Failed ids:', failed.join(', '));
  }

  const blob = new Blob([JSON.stringify(results)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'raid-boss-details.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  console.info('Triggered download of raid-boss-details.json');
})();
