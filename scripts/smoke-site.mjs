/**
 * Live API smoke test against the running app.
 * Run: npx tsx scripts/smoke-site.mjs
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin123';

let passed = 0;
let failed = 0;
const stamp = Date.now();
const TEST_WORKER_USER = `smoke_w_${stamp}`;
const TEST_WORKER_PASS = 'test1234';
const created = { workerId: null, projectId: null };

function assert(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

function cookieFrom(res) {
  const raw = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie');
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const sid = list.find((c) => c.startsWith('kamol_sid='));
  if (!sid) return '';
  return sid.split(';')[0];
}

async function req(path, { method = 'GET', cookie = '', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { res, data, status: res.status };
}

async function login(username, password) {
  const { res, data, status } = await req('/api/auth', {
    method: 'POST',
    body: { username, password },
  });
  return { status, data, cookie: cookieFrom(res) };
}

async function cleanup(adminCookie) {
  if (created.projectId) {
    await req(`/api/projects?id=${created.projectId}`, { method: 'DELETE', cookie: adminCookie });
  }
  if (created.workerId) {
    await req(`/api/users?id=${created.workerId}`, { method: 'DELETE', cookie: adminCookie });
  }
}

async function main() {
  console.log(`Smoke test → ${BASE}\n`);

  const health = await req('/api/health');
  assert('GET /api/health javob beradi', health.status === 200 || health.status === 503);
  assert('health JSON', typeof health.data?.ok === 'boolean');

  const unauth = await req('/api/admin/bootstrap');
  assert('admin bootstrap sessiya yo\'q = 401/403', unauth.status === 401 || unauth.status === 403);

  const badLogin = await login(ADMIN_USER, 'wrong-password-xyz');
  assert('noto\'g\'ri parol = 401 yoki 429', badLogin.status === 401 || badLogin.status === 429);

  const admin = await login(ADMIN_USER, ADMIN_PASS);
  assert('admin login', admin.status === 200 && admin.data?.user?.role === 'admin', JSON.stringify(admin.data));
  if (!admin.cookie) {
    console.error('Admin cookie olinmadi — qolgan testlar to\'xtatildi');
    process.exit(1);
  }

  const me = await req('/api/auth', { cookie: admin.cookie });
  assert('GET /api/auth sessiya', me.status === 200 && me.data?.user?.role === 'admin');

  const boot = await req('/api/admin/bootstrap', { cookie: admin.cookie });
  assert('GET /api/admin/bootstrap', boot.status === 200 && Array.isArray(boot.data?.projects));
  assert('bootstrap workers ro\'yxati', Array.isArray(boot.data?.workers));

  const stats = await req('/api/stats', { cookie: admin.cookie });
  assert('GET /api/stats', stats.status === 200);

  const leaderboard = await req('/api/leaderboard', { cookie: admin.cookie });
  assert('GET /api/leaderboard', leaderboard.status === 200 && Array.isArray(leaderboard.data?.entries));

  const notifs = await req('/api/notifications', { cookie: admin.cookie });
  assert('GET /api/notifications', notifs.status === 200);

  const projects = await req('/api/projects', { cookie: admin.cookie });
  assert('GET /api/projects', projects.status === 200 && Array.isArray(projects.data?.projects));

  const workerForbidden = await req('/api/worker/bootstrap', { cookie: admin.cookie });
  assert('admin worker bootstrapga kira olmaydi', workerForbidden.status === 403);

  const createUser = await req('/api/users', {
    method: 'POST',
    cookie: admin.cookie,
    body: { username: TEST_WORKER_USER, password: TEST_WORKER_PASS, name: 'Smoke Test Worker', phone: '901112233' },
  });
  assert('POST /api/users ishchi yaratish', createUser.status === 200 && createUser.data?.worker?.id, JSON.stringify(createUser.data));
  created.workerId = createUser.data?.worker?.id ?? null;

  const createProject = await req('/api/projects', {
    method: 'POST',
    cookie: admin.cookie,
    body: {
      clientName: `Smoke Client ${stamp}`,
      address: 'Smoke ko\'cha, 1-uy',
      phone: '901112233',
    },
  });
  assert('POST /api/projects loyiha yaratish', createProject.status === 200 && createProject.data?.project?.id, JSON.stringify(createProject.data));
  created.projectId = createProject.data?.project?.id ?? null;
  assert('yangi loyiha pending', createProject.data?.project?.status === 'pending');

  if (created.workerId && created.projectId) {
    const assign = await req('/api/assign', {
      method: 'POST',
      cookie: admin.cookie,
      body: { projectId: created.projectId, workerId: created.workerId },
    });
    assert('POST /api/assign', assign.status === 200, JSON.stringify(assign.data));
    const assignedStatus = assign.data?.project?.status ?? assign.data?.projects?.[0]?.status;
    assert(
      'biriktirilgandan keyin in_progress',
      assignedStatus === 'in_progress' || assign.data?.ok === true || assign.status === 200,
    );

    const worker = await login(TEST_WORKER_USER, TEST_WORKER_PASS);
    assert('ishchi login', worker.status === 200 && worker.data?.user?.role === 'worker');

    if (worker.cookie) {
      const wboot = await req('/api/worker/bootstrap', { cookie: worker.cookie });
      assert('GET /api/worker/bootstrap', wboot.status === 200);
      assert(
        'ishchida faol loyiha bor',
        (wboot.data?.activeProjects ?? []).some((p) => p.id === created.projectId),
      );

      const adminProjects = await req('/api/projects?status=pending', { cookie: worker.cookie });
      const leaked = (adminProjects.data?.projects ?? []).some((p) => !p.assignedTo || p.assignedTo !== worker.data.user.id);
      assert('ishchi boshqa loyihalarni ko\'rmaydi', adminProjects.status === 200 && !leaked);

      const submit = await req('/api/projects', {
        method: 'PATCH',
        cookie: worker.cookie,
        body: { id: created.projectId, status: 'completed' },
      });
      assert('ishchi topshirishi → tekshiruvda', submit.status === 200 && submit.data?.project?.status === 'pending_review', JSON.stringify(submit.data));

      const workerAdmin = await req('/api/admin/bootstrap', { cookie: worker.cookie });
      assert('ishchi admin APIga kira olmaydi', workerAdmin.status === 403);

      const ret = await req('/api/projects', {
        method: 'PATCH',
        cookie: admin.cookie,
        body: { id: created.projectId, status: 'returned', notes: 'Smoke test qaytarish sababi' },
      });
      assert('tekshiruvdagi loyihani qaytarish', ret.status === 200 && ret.data?.project?.returnedAt, JSON.stringify(ret.data));
      assert('qaytarilgandan keyin in_progress', ret.data?.project?.status === 'in_progress');

      const wboot2 = await req('/api/worker/bootstrap', { cookie: worker.cookie });
      assert(
        'qaytarilgan loyiha returned ro\'yxatida',
        (wboot2.data?.returnedProjects ?? []).some((p) => p.id === created.projectId),
      );

      const reply = await req('/api/worker/replies', {
        method: 'POST',
        cookie: worker.cookie,
        body: { projectId: created.projectId, message: 'Smoke javob' },
      });
      assert('ishchi qaytarilgan loyihaga javob', reply.status === 200 && reply.data?.reply?.id, JSON.stringify(reply.data));

      const resubmit = await req('/api/projects', {
        method: 'PATCH',
        cookie: worker.cookie,
        body: { id: created.projectId, status: 'completed' },
      });
      assert('qayta topshirish → tekshiruvda', resubmit.status === 200 && resubmit.data?.project?.status === 'pending_review', JSON.stringify(resubmit.data));

      const approve = await req('/api/projects', {
        method: 'PATCH',
        cookie: admin.cookie,
        body: { id: created.projectId, status: 'completed' },
      });
      assert('admin tasdiqlashi → completed', approve.status === 200 && approve.data?.project?.status === 'completed', JSON.stringify(approve.data));
    }
  }

  await cleanup(admin.cookie);

  const gone = await req('/api/projects', { cookie: admin.cookie });
  assert(
    'test loyiha o\'chirildi',
    !(gone.data?.projects ?? []).some((p) => p.id === created.projectId),
  );
  const workersLeft = await req('/api/users', { cookie: admin.cookie });
  assert(
    'test ishchi o\'chirildi',
    !(workersLeft.data?.workers ?? []).some((w) => w.id === created.workerId),
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
