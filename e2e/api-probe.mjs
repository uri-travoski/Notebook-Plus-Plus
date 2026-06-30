const base = process.env.BASE || 'http://127.0.0.1:3942'
let cookie = ''

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const sc = res.headers.getSetCookie?.() ?? []
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json }
}

console.log(
  'login:',
  (await call('POST', '/api/auth/login', { username: 'dev', password: 'notebookpp' })).status,
)

let tree = (await call('GET', '/api/tree')).json
console.log(
  'seed tree:',
  tree.projects
    .map((p) => `${p.name}[${p.notebooks.map((n) => `${n.name}:${n.notes.length}`).join(',')}]`)
    .join(' | '),
)

const proj = (await call('POST', '/api/projects', { name: 'Probe Project' })).json
const nb = (await call('POST', '/api/notebooks', { projectId: proj.id, name: 'Probe NB' })).json
const note = (
  await call('POST', '/api/documents', { notebookId: nb.id, type: 'page', title: 'Probe Note' })
).json
console.log(
  'created:',
  proj.name,
  '/',
  nb.name,
  '/',
  note.title,
  `(type=${note.type}, pos=${note.position})`,
)

tree = (await call('GET', '/api/tree')).json
let pp = tree.projects.find((p) => p.id === proj.id)
console.log(
  'tree shows probe note count:',
  pp?.notebooks[0]?.notes.length,
  '| starred:',
  (await call('PATCH', `/api/documents/${note.id}`, { isStarred: true })).json.isStarred,
)

console.log(
  'archive note status:',
  (await call('PATCH', `/api/documents/${note.id}`, { archived: true })).status,
)
tree = (await call('GET', '/api/tree')).json
pp = tree.projects.find((p) => p.id === proj.id)
console.log('note count after archive (expect 0):', pp?.notebooks[0]?.notes.length)

const note2 = (
  await call('POST', '/api/documents', { notebookId: nb.id, type: 'page', title: 'Trash Me' })
).json
console.log(
  'trash note status:',
  (await call('PATCH', `/api/documents/${note2.id}`, { deleted: true })).status,
)
tree = (await call('GET', '/api/tree')).json
pp = tree.projects.find((p) => p.id === proj.id)
console.log('note count after trash (expect 0):', pp?.notebooks[0]?.notes.length)

const prefs = (
  await call('PATCH', '/api/me/preferences', { sidebarCollapsed: ['abc'], bodyFont: 'lora' })
).json
console.log(
  'prefs merged:',
  JSON.stringify({
    sidebarCollapsed: prefs.sidebarCollapsed,
    bodyFont: prefs.bodyFont,
    monoFont: prefs.monoFont,
  }),
)

console.log('delete probe project:', (await call('DELETE', `/api/projects/${proj.id}`)).json)
tree = (await call('GET', '/api/tree')).json
console.log('probe project gone:', !tree.projects.find((p) => p.id === proj.id))
// reset bodyFont pref back to default so the seed account stays clean
await call('PATCH', '/api/me/preferences', { bodyFont: 'inter', sidebarCollapsed: [] })
