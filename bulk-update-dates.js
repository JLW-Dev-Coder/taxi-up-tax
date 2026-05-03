const TOKEN = process.env.CLICKUP_API_TOKEN;
const LIST_ID = '901713417136';
const TARGET_MS = 1777766400000; // midnight UTC 2026-05-03

if (!TOKEN) {
  console.error('CLICKUP_API_TOKEN not set');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(method, url, body) {
  const opts = {
    method,
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function fetchAllTasks() {
  const all = [];
  for (let page = 0; ; page++) {
    const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=true&subtasks=true&page=${page}`;
    const { status, data } = await api('GET', url);
    if (status !== 200) {
      console.error(`GET page ${page} failed: ${status}`, data);
      throw new Error('fetch failed');
    }
    const tasks = data.tasks || [];
    if (tasks.length === 0) break;
    all.push(...tasks);
    console.log(`  page ${page}: ${tasks.length} tasks (total so far: ${all.length})`);
    if (data.last_page === true) break;
  }
  // Dedupe
  const seen = new Set();
  return all.filter(t => seen.has(t.id) ? false : (seen.add(t.id), true));
}

async function updateTask(task, attempt = 1) {
  const url = `https://api.clickup.com/api/v2/task/${task.id}`;
  const body = {
    start_date: TARGET_MS,
    due_date: TARGET_MS,
    start_date_time: false,
    due_date_time: false,
  };
  const { status, data } = await api('PUT', url, body);
  if (status === 200) return { ok: true };
  if (status === 429 && attempt <= 3) {
    const wait = 1000 * Math.pow(2, attempt);
    console.log(`    429 rate-limited, retry ${attempt} after ${wait}ms`);
    await sleep(wait);
    return updateTask(task, attempt + 1);
  }
  return { ok: false, status, data };
}

(async () => {
  console.log('Fetching tasks...');
  const tasks = await fetchAllTasks();
  console.log(`\nTotal tasks found: ${tasks.length}\n`);

  let ok = 0;
  const failures = [];
  for (const t of tasks) {
    const r = await updateTask(t);
    if (r.ok) {
      ok++;
      console.log(`  ✓ ${t.id}  ${t.name}`);
    } else {
      failures.push({ id: t.id, name: t.name, status: r.status, err: r.data });
      console.log(`  ✗ ${t.id}  ${t.name}  [${r.status}]`);
    }
    await sleep(200);
  }

  console.log(`\n${ok} of ${tasks.length} tasks updated successfully`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ${f.id}  ${f.name}  status=${f.status}  err=${JSON.stringify(f.err).slice(0,200)}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
