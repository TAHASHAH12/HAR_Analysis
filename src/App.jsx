import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { Bars, Select, Tile } from './ui.jsx'
import { PLATFORMS, countBy, uniq } from './util.js'
import { Clusters, Findings, Prompts, ShareOfVoice, Sources } from './Analysis.jsx'
import logoSvg from './assets/wldm-h-black.svg?raw'

// Official lockup, inlined as the brand brief requires (never retyped or linked as an image).
const LOGO = logoSvg.replace(/<\?xml[^>]*\?>\s*/, '').replace('<svg ', '<svg role="img" aria-label="WLDM" ')

const TABS = ['Findings', 'Clusters', 'Share of voice', 'Sources', 'Prompts', 'Captures', 'Profound overview', 'Profound citations', 'Opportunities']
const PROFOUND_TABS = ['Profound overview', 'Profound citations', 'Opportunities']
const slug = (t) => t.replaceAll(' ', '-').toLowerCase()
const TREND_ORDER = ['rising', 'stable', 'declining', 'lapsed', 'dead']
const STATUS_LABEL = {
  retrieved_and_cited: 'Retrieved and cited',
  retrieved_not_cited: 'Retrieved, not cited',
  cited_not_in_results: 'Cited, not in results',
  supporting_only: 'Supporting source',
  seen_unclassified: 'Seen (unclassified)',
  cited: 'Cited',
  linked_in_answer: 'Linked in answer',
  not_seen: 'Not seen',
}

function Overview({ rows }) {
  const urls = uniq(rows.map((r) => r.url))
  const domains = uniq(rows.map((r) => r.domain))
  const stakeOwned = rows.filter((r) => /(^|\.)stake\.(com|us)$/.test(r.domain)).length
  const platformsByUrl = new Map()
  for (const r of rows) {
    platformsByUrl.set(r.url, (platformsByUrl.get(r.url) || new Set()).add(r.platform))
  }
  const sharedUrls = [...platformsByUrl.values()].filter((s) => s.size > 1).length
  const domainCounts = countBy(rows, (r) => r.domain)
  const onceOnly = [...domainCounts.values()].filter((n) => n === 1).length

  const byPrompt = uniq(rows.map((r) => r.prompt))
    .map((prompt) => ({
      label: prompt,
      segments: PLATFORMS.map((p) => ({
        key: p,
        value: rows.filter((r) => r.prompt === prompt && r.platform === p).length,
      })),
    }))
    .sort((a, b) => b.segments.reduce((s, x) => s + x.value, 0) - a.segments.reduce((s, x) => s + x.value, 0))

  const trendOf = new Map(rows.map((r) => [r.domain, r.trend]))
  const trendCounts = countBy([...trendOf.values()], (t) => t)
  const byTrend = TREND_ORDER.map((t) => ({
    label: t[0].toUpperCase() + t.slice(1),
    segments: [{ key: 'Domains', value: trendCounts.get(t) || 0 }],
  }))
  const byCountry = [...countBy(rows, (r) => r.country)]
    .sort((a, b) => b[1] - a[1])
    .map(([country]) => ({
      label: country,
      segments: PLATFORMS.map((p) => ({
        key: p,
        value: rows.filter((r) => r.country === country && r.platform === p).length,
      })),
    }))
  const inDb = domains.filter((d) => rows.find((r) => r.domain === d).inMarketplace).length

  return (
    <>
      <div className="tiles">
        <Tile label="Citations" value={rows.length} note={`${uniq(rows.map((r) => r.prompt)).length} prompts`} />
        <Tile label="Unique URLs" value={urls.length} note={`${domains.length} domains`} />
        <Tile label="Stake-owned pages cited" value={stakeOwned} note="stake.com / stake.us" />
        <Tile label="URLs cited by both platforms" value={sharedUrls} note={`of ${urls.length}`} />
        <Tile label="Domains cited only once" value={onceOnly} note={`of ${domains.length}`} />
        <Tile label="Domains in marketplace DB" value={inDb} note={`${domains.length - inDb} not in DB`} />
      </div>
      <section className="card">
        <h2>Citations per prompt</h2>
        <Bars rows={byPrompt} legend={PLATFORMS} caption="Rows in the Profound export, one per cited URL, country and platform." />
      </section>
      <div className="grid-2">
        <section className="card">
          <h2>Citations per country</h2>
          <Bars rows={byCountry} legend={PLATFORMS} />
        </section>
        <section className="card">
          <h2>Cited domains by 12-month trend</h2>
          <Bars rows={byTrend} />
        </section>
      </div>
    </>
  )
}

function Citations({ rows }) {
  const [search, setSearch] = useState('')
  const needle = search.trim().toLowerCase()
  const shown = rows.filter(
    (r) => !needle || r.url.toLowerCase().includes(needle) || r.prompt.toLowerCase().includes(needle),
  )
  return (
    <section className="card">
      <div className="card-head">
        <h2>Cited URLs ({shown.length})</h2>
        <input
          type="search"
          placeholder="Search URL or prompt"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Prompt</th><th>Platform</th><th>Country</th><th>Cited URL</th>
              <th>In DB</th><th className="num">DR</th><th>Trend</th><th>Citations (Sep25 → Sep26)</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                <td>{r.prompt}</td>
                <td>{r.platform}</td>
                <td>{r.country}</td>
                <td className="url"><a href={r.url} target="_blank" rel="noreferrer">{r.url}</a></td>
                <td>{r.inMarketplace ? 'Yes' : 'No'}</td>
                <td className="num">{r.dr ?? ''}</td>
                <td><span className={`chip trend-${r.trend}`}>{r.trend}</span></td>
                <td className="mono">{r.trajectory.join(' → ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DomainTable({ title, note, domains }) {
  return (
    <section className="card">
      <h2>{title} ({domains.length})</h2>
      <p className="note">{note}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Domain</th><th>Trend</th><th>Citations (Sep25 → Sep26)</th>
              <th className="num">Latest</th><th>Platforms</th><th>Prompts cited for</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.domain}>
                <td>{d.domain}</td>
                <td><span className={`chip trend-${d.trend}`}>{d.trend}</span></td>
                <td className="mono">{d.trajectory.join(' → ')}</td>
                <td className="num">{d.trajectory.at(-1).toLocaleString()}</td>
                <td>{d.platforms.join(', ')}</td>
                <td>{d.prompts.join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Opportunities({ rows }) {
  const domains = uniq(rows.map((r) => r.domain)).map((domain) => {
    const own = rows.filter((r) => r.domain === domain)
    return {
      ...own[0],
      platforms: uniq(own.map((r) => r.platform)),
      prompts: uniq(own.map((r) => r.prompt)),
    }
  })
  const byLatest = (a, b) => b.trajectory.at(-1) - a.trajectory.at(-1)
  return (
    <>
      <DomainTable
        title="Rising and not in the marketplace DB"
        note="Domains the AI tools cite more each quarter that are not in the database yet."
        domains={domains.filter((d) => !d.inMarketplace && d.trend === 'rising').sort(byLatest)}
      />
      <DomainTable
        title="In the marketplace DB and cited"
        note="Domains already available that the AI tools cite for these prompts."
        domains={domains.filter((d) => d.inMarketplace).sort(byLatest)}
      />
      <DomainTable
        title="Dead or lapsed"
        note="Cited in this export, but with no citations left in the latest period."
        domains={domains.filter((d) => ['dead', 'lapsed'].includes(d.trend)).sort(byLatest)}
      />
    </>
  )
}

function HarFindings({ har }) {
  const [selected, setSelected] = useState('')
  const turns = useMemo(() => {
    const map = new Map()
    const turn = (r) => {
      const key = [r.har, r.platform, r.prompt].join('|')
      if (!map.has(key)) map.set(key, { ...r, queries: [], urls: [], overlap: [] })
      return map.get(key)
    }
    ;(har.captures || []).forEach((r) => Object.assign(turn(r), { searched: r.websites_searched, surface: r.surface }))
    har.queries.forEach((r) => turn(r).queries.push(r.query))
    har.urls.forEach((r) => turn(r).urls.push(r))
    har.overlap.forEach((r) => turn(r).overlap.push(r))
    return [...map.values()]
  }, [har])

  if (!turns.length) {
    return (
      <section className="card empty">
        <h2>No captures yet</h2>
        <p>This tab fills in once HAR captures have been extracted.</p>
        <ol>
          <li>Record captures following <code>CAPTURE-GUIDE.md</code> and save them in <code>~/har-captures</code>.</li>
          <li>Run <code>python3 har_extract.py</code> in the project folder.</li>
          <li>Run <code>python3 build_app_data.py</code>, then reload this page.</li>
        </ol>
      </section>
    )
  }

  const current = selected || turns[0].har
  const isCited = (u) => ['cited', 'retrieved_and_cited', 'cited_not_in_results'].includes(u.status)
  const allUrls = turns.flatMap((t) => t.urls)
  const summary = (
    <section className="card">
      <h2>All captures ({turns.length})</h2>
      <p className="note">
        One row per recorded answer. Select a row to see its sources below. "Websites searched" is the count the
        tool reports. Where it is higher than the pages cited, the difference is pages that were retrieved and dropped.
      </p>
      <div className="tiles">
        <Tile label="Captures" value={turns.length} note={`${uniq(turns.map((t) => t.prompt)).length} prompts`} />
        <Tile label="Pages cited or linked" value={allUrls.length} note={`${uniq(allUrls.map((u) => u.domain)).length} domains`} />
        <Tile label="Stake-owned pages" value={allUrls.filter((u) => u.stake_owned === 'yes').length} note="stake.com, stake.us, stake.bet" />
        <Tile label="Domains also in Profound" value={uniq(allUrls.filter((u) => u.domain_in_profound).map((u) => u.domain)).length} note={`of ${uniq(allUrls.map((u) => u.domain)).length}`} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Prompt</th><th>Platform</th><th>Capture</th><th className="num">Websites searched</th>
              <th className="num">Pages cited</th><th className="num">Other pages</th><th className="num">Stake-owned</th>
            </tr>
          </thead>
          <tbody>
            {turns.map((t) => (
              <tr key={t.har} className={t.har === current ? 'highlight' : ''} onClick={() => setSelected(t.har)} style={{ cursor: 'pointer' }}>
                <td>{t.prompt}</td>
                <td>{t.platform}</td>
                <td className="mono">{t.har.replace('.har', '')}</td>
                <td className="num">{t.searched || 'not reported'}</td>
                <td className="num">{t.urls.filter(isCited).length}</td>
                <td className="num">{t.urls.filter((u) => !isCited(u)).length}</td>
                <td className="num">{t.urls.filter((u) => u.stake_owned === 'yes').length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  const cards = turns.filter((t) => t.har === current).map((t) => {
    const statusCounts = [...countBy(t.urls, (u) => u.status)].sort((a, b) => b[1] - a[1])
    const stake = t.urls.filter((u) => u.stake_owned === 'yes')
    return (
      <section className="card" key={[t.har, t.platform, t.prompt].join('|')}>
        <h2>{t.prompt}</h2>
        <p className="note">
          {t.platform}{t.country ? ` · ${t.country}` : ''}{t.surface ? ` · ${t.surface}` : ''} · {t.har}
        </p>
        <div className="tiles">
          {t.searched
            ? <Tile label="Websites searched" value={t.searched} note="reported by the tool" />
            : <Tile label="Search queries issued" value={t.queries.length} note={t.queries.length ? '' : 'not exposed on this surface'} />}
          <Tile label="Pages seen" value={t.urls.length} />
          <Tile label="Pages cited" value={t.urls.filter(isCited).length} />
          <Tile
            label="Stake-owned pages"
            value={stake.length}
            note={stake.map((u) => STATUS_LABEL[u.status]).join(', ') || 'none seen'}
          />
        </div>
        {t.queries.length > 0 && (
          <>
            <h3>Search queries, in order</h3>
            <ol className="queries">{t.queries.map((q) => <li key={q}>{q}</li>)}</ol>
          </>
        )}
        <h3>Pages by outcome</h3>
        <Bars rows={statusCounts.map(([s, n]) => ({ label: STATUS_LABEL[s] || s, segments: [{ key: 'Pages', value: n }] }))} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Outcome</th><th>URL</th><th>Title</th><th>In Profound</th><th>In DB</th></tr>
            </thead>
            <tbody>
              {t.urls.map((u) => (
                <tr key={u.url} className={u.stake_owned === 'yes' ? 'highlight' : ''}>
                  <td><span className={`chip status-${u.status}`}>{STATUS_LABEL[u.status] || u.status}</span></td>
                  <td className="url"><a href={u.url} target="_blank" rel="noreferrer">{u.url}</a></td>
                  <td>{u.title}</td>
                  <td>{u.domain_in_profound ? 'Yes' : ''}</td>
                  <td>{u.in_marketplace_db === 'YES' ? 'Yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {t.overlap.length > 0 && (
          <>
            <h3>URLs Profound reported for this prompt</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Profound cited URL</th><th>Profound country</th><th>This URL in the HAR</th><th>Its domain in the HAR</th></tr>
                </thead>
                <tbody>
                  {t.overlap.map((o, i) => (
                    <tr key={i}>
                      <td className="url">{o.profound_cited_url}</td>
                      <td>{o.profound_country}</td>
                      <td>{STATUS_LABEL[o.url_status_in_har] || o.url_status_in_har}</td>
                      <td>{o.domain_status_in_har.split('|').map((s) => STATUS_LABEL[s] || s).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    )
  })

  return <>{summary}{cards}</>
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  // The tab lives in the URL hash so a view can be linked or reloaded.
  const [tab, setTabState] = useState(
    () => TABS.find((t) => slug(t) === window.location.hash.slice(1)) || TABS[0],
  )
  const setTab = (t) => {
    window.history.replaceState(null, '', `#${slug(t)}`)
    setTabState(t)
  }
  const [country, setCountry] = useState('')
  const [platform, setPlatform] = useState('')
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`data.json: HTTP ${res.status}`))))
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <main className="app"><p className="error">Could not load data ({error}). Run <code>python3 build_app_data.py</code> in the project folder.</p></main>
  }
  if (!data) return <main className="app"><p className="note">Loading…</p></main>

  const all = data.profound
  const rows = all.filter(
    (r) => (!country || r.country === country) && (!platform || r.platform === platform) && (!prompt || r.prompt === prompt),
  )
  const showFilters = PROFOUND_TABS.includes(tab)
  const a = data.analysis

  return (
    <main className="app">
      <header>
        <div>
          <div className="brand">
            <span className="logo" dangerouslySetInnerHTML={{ __html: LOGO }} />
            <span className="chip-wldm">WLDM</span>
            <span className="brand-tag">AI citation analysis · Stake · October 2026</span>
          </div>
          <h1>What AI search <em>cites</em> for Stake</h1>
          <p className="note">
            {a ? `${a.captures} captures · ${a.prompts} prompts · ` : ''}{data.har.urls.length} source records · Profound export {data.profoundFile} · built {data.generated.replace('T', ' ')}
          </p>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </header>
      {showFilters && (
        <div className="filters">
          <Select label="Country" value={country} onChange={setCountry} options={uniq(all.map((r) => r.country)).sort()} />
          <Select label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} />
          <Select label="Prompt" value={prompt} onChange={setPrompt} options={uniq(all.map((r) => r.prompt)).sort()} />
        </div>
      )}
      {showFilters && rows.length === 0 && <p className="note">No citations match these filters.</p>}
      {!a && !showFilters && tab !== 'Captures' && <p className="note">No analysis yet. Run <code>npm run extract</code>.</p>}
      {a && tab === 'Findings' && <Findings a={a} />}
      {a && tab === 'Clusters' && <Clusters a={a} />}
      {a && tab === 'Share of voice' && <ShareOfVoice a={a} />}
      {a && tab === 'Sources' && <Sources a={a} />}
      {a && tab === 'Prompts' && <Prompts a={a} />}
      {tab === 'Captures' && <HarFindings har={data.har} />}
      {tab === 'Profound overview' && rows.length > 0 && <Overview rows={rows} />}
      {tab === 'Profound citations' && rows.length > 0 && <Citations rows={rows} />}
      {tab === 'Opportunities' && rows.length > 0 && <Opportunities rows={rows} />}
    </main>
  )
}
