import { useState } from 'react'
import { Bars, Select, Tile } from './ui.jsx'
import { PLATFORMS, uniq } from './util.js'

// Source types shown as their own colour; the small ones fold into "Other".
const MAIN_TYPES = [
  'Stake-owned',
  'Competitor operators',
  'Affiliate, review and niche sites',
  'News and sports media',
  'Regulator, government, safer gambling',
  'Community and user reviews',
  'Crypto and finance',
]
const TYPE_LEGEND = [...MAIN_TYPES, 'Other']

function typeSegments(types) {
  const share = (name) => types.find((t) => t.type === name)?.share || 0
  const main = MAIN_TYPES.map((name) => ({ key: name, value: share(name) }))
  const other = Math.max(0, Math.round((100 - main.reduce((s, x) => s + x.value, 0)) * 10) / 10)
  return [...main, { key: 'Other', value: other }]
}

const yesNo = (v) => (v ? <span className="chip trend-rising">yes</span> : <span className="chip">no</span>)
const fmt = (v, unit = '') => (v === null || v === undefined ? 'n/a' : `${v}${unit}`)

export function Findings({ a }) {
  const promptById = new Map(a.perPrompt.map((p) => [p.id, p]))
  const gaps = a.gaps.map((id) => promptById.get(id))
  const nonEnglish = a.stakePages.filter((p) => p.nonEnglish)
  return (
    <>
      <div className="tiles">
        <Tile label="Captures" value={a.captures} note={`${a.prompts} prompts, ${a.clusters.length} clusters`} />
        <Tile label="Distinct sites cited" value={a.sites.length} note={`${a.sites.filter((s) => s.prompts > 1).length} cited for 2+ prompts`} />
        {PLATFORMS.filter((p) => a.overall[p]).map((p) => (
          <Tile
            key={p}
            label={`${p}: Stake named, unbranded prompts`}
            value={fmt(a.overall[p].stakeMentionRate, '%')}
            note={`of ${a.overall[p].unbranded} answers`}
          />
        ))}
        {a.overall.ChatGPT?.avgSearched && (
          <Tile
            label="ChatGPT: websites searched per answer"
            value={a.overall.ChatGPT.avgSearched}
            note={`${a.overall.ChatGPT.avgSources} source pages shown`}
          />
        )}
        {a.localised?.ChatGPT > 0 && (
          <Tile label="ChatGPT answers localised to the browsing country" value={a.localised.ChatGPT} note={`of ${a.overall.ChatGPT.captures}, Google AI Mode ${a.localised['Google AI Mode'] || 0}`} />
        )}
        <Tile label="Site overlap between platforms" value={fmt(Math.round(a.overlap.avgJaccard * 100), '%')} note={`${a.overlap.zeroOverlap} of ${a.overlap.prompts} prompts share no site`} />
      </div>

      <section className="card">
        <h2>Where each platform gets its answers</h2>
        <Bars
          rows={PLATFORMS.filter((p) => a.overall[p]).map((p) => ({ label: p, segments: typeSegments(a.overall[p].types) }))}
          max={100}
          legend={TYPE_LEGEND}
          unit="%"
          hideTotal
          caption="Share of source records by type of site, all prompts."
        />
      </section>

      <div className="grid-2">
        {PLATFORMS.filter((p) => a.overall[p]).map((p) => (
          <section className="card" key={p}>
            <h2>{p}: answers that name Stake</h2>
            <Bars
              rows={a.byCluster
                .filter((r) => r.platform === p && r.stakeMentionRate !== null)
                .map((r) => ({ label: r.cluster, segments: [{ key: 'Answers naming Stake', value: r.stakeMentionRate }], note: `${r.stakeMentionRate}% of ${r.unbranded}` }))}
              max={100}
              unit="%"
              caption="Prompts that do not mention Stake, by cluster."
            />
          </section>
        ))}
      </div>

      <section className="card">
        <h2>Category prompts where no platform names Stake ({gaps.length})</h2>
        <p className="note">Commercial prompts with no Stake mention on either platform, and the brands named instead.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Prompt</th><th>Cluster</th>{PLATFORMS.map((p) => <th key={p}>{p} names</th>)}</tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.id}>
                  <td>{g.prompt}</td>
                  <td>{g.cluster}</td>
                  {PLATFORMS.map((p) => <td key={p}>{g.platforms[p]?.brands.join(', ') || (g.platforms[p] ? 'no brand' : 'not captured')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Placement targets ({a.targets.length})</h2>
        <p className="note">
          Third-party editorial sites cited for two or more prompts that do not mention Stake. Marketplace status is known only for sites in the Profound export.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Site</th><th>Type</th><th className="num">Unbranded prompts</th><th className="num">ChatGPT</th>
                <th className="num">AI Mode</th><th className="num">Clusters</th><th>In DB</th><th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {a.targets.map((s) => (
                <tr key={s.site}>
                  <td>{s.site}</td>
                  <td>{s.type}</td>
                  <td className="num">{s.unbrandedPrompts}</td>
                  <td className="num">{s.byPlatform.ChatGPT || 0}</td>
                  <td className="num">{s.byPlatform['Google AI Mode'] || 0}</td>
                  <td className="num">{s.clusters}</td>
                  <td>{s.inMarketplace === 'unknown' ? 'not checked' : s.inMarketplace}</td>
                  <td>{s.trend && <span className={`chip trend-${s.trend}`}>{s.trend}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Which parts of Stake's sites get cited</h2>
        <Bars rows={a.stakeSections.map((s) => ({ label: s.section, segments: [{ key: 'Citations', value: s.citations }] }))} caption="Citations of Stake-owned pages, grouped by site section, both platforms." />
      </section>

      <section className="card">
        <h2>Stake pages the tools cite ({a.stakePages.length})</h2>
        <p className="note">
          {nonEnglish.length} of {a.stakePages.length} cited Stake URLs are non-English versions served for English prompts.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>URL</th><th className="num">Citations</th><th>Locale in URL</th></tr></thead>
            <tbody>
              {a.stakePages.slice(0, 60).map((p) => (
                <tr key={p.url} className={p.nonEnglish ? 'highlight' : ''}>
                  <td className="url"><a href={p.url} target="_blank" rel="noreferrer">{p.url}</a></td>
                  <td className="num">{p.citations}</td>
                  <td>{p.locale || 'none'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export function Clusters({ a }) {
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const rows = a.byCluster.filter((r) => r.platform === platform && r.captures > 0)
  return (
    <>
      <div className="filters">
        <Select label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} all="" />
      </div>
      <section className="card">
        <h2>Source mix by cluster</h2>
        <Bars
          rows={rows.map((r) => ({ label: r.cluster, segments: typeSegments(r.types) }))}
          max={100}
          legend={TYPE_LEGEND}
          unit="%"
          hideTotal
          caption={`${platform}. Share of source records by type of site.`}
        />
      </section>
      <section className="card">
        <h2>Cluster detail</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cluster</th><th className="num">Captures</th><th className="num">Websites searched</th>
                <th className="num">Sources shown</th><th className="num">Stake named</th>
                <th className="num">Stake-owned sources</th><th>Most cited sites</th><th>Brands named most</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cluster}>
                  <td>{r.cluster}</td>
                  <td className="num">{r.captures}</td>
                  <td className="num">{fmt(r.avgSearched)}</td>
                  <td className="num">{r.avgSources}</td>
                  <td className="num">{fmt(r.stakeMentionRate, '%')}</td>
                  <td className="num">{r.stakeOwnedShare}%</td>
                  <td>{r.topSites.slice(0, 5).map((s) => `${s.site} (${s.prompts})`).join(', ')}</td>
                  <td>{r.topBrands.slice(0, 5).map((b) => `${b.brand} (${b.answers})`).join(', ') || 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Websites searched and sources shown are averages per answer. Stake named covers prompts that do not mention Stake.</p>
      </section>
    </>
  )
}

export function ShareOfVoice({ a }) {
  return (
    <div className="grid-2">
      {a.shareOfVoice.map((s) => (
        <section className="card" key={s.platform}>
          <h2>{s.platform}: brands named</h2>
          <Bars
            rows={s.brands.map((b) => ({ label: b.brand, segments: [{ key: 'Answers naming the brand', value: b.share }], note: `${b.share}% (${b.answers})` }))}
            max={Math.max(1, ...s.brands.map((b) => b.share)) * 1.35}
            unit="%"
            highlight="Stake"
            caption={`Share of ${s.answers} answers to prompts that do not mention Stake.`}
          />
        </section>
      ))}
    </div>
  )
}

export function Sources({ a }) {
  const [type, setType] = useState('')
  const [db, setDb] = useState('')
  const [search, setSearch] = useState('')
  const shown = a.sites.filter(
    (s) => (!type || s.type === type) && (!db || s.inMarketplace === db) && (!search || s.site.includes(search.trim().toLowerCase())),
  )
  return (
    <section className="card">
      <div className="card-head">
        <h2>Sites cited ({shown.length})</h2>
        <input type="search" placeholder="Search site" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="filters">
        <Select label="Type of site" value={type} onChange={setType} options={uniq(a.sites.map((s) => s.type)).sort()} />
        <Select label="In marketplace DB" value={db} onChange={setDb} options={['yes', 'no', 'unknown']} />
      </div>
      <p className="note">
        Prompts citing counts each prompt once per site. Marketplace status is known only for sites in the Profound export.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Site</th><th>Type</th><th className="num">Prompts citing</th><th className="num">Unbranded</th>
              <th className="num">ChatGPT</th><th className="num">AI Mode</th><th className="num">Clusters</th>
              <th>In Profound</th><th>In DB</th><th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 400).map((s) => (
              <tr key={s.site}>
                <td>{s.site}</td>
                <td>{s.type}</td>
                <td className="num">{s.prompts}</td>
                <td className="num">{s.unbrandedPrompts}</td>
                <td className="num">{s.byPlatform.ChatGPT || 0}</td>
                <td className="num">{s.byPlatform['Google AI Mode'] || 0}</td>
                <td className="num">{s.clusters}</td>
                <td>{s.inProfound ? 'Yes' : ''}</td>
                <td>{s.inMarketplace === 'unknown' ? '' : s.inMarketplace}</td>
                <td>{s.trend && <span className={`chip trend-${s.trend}`}>{s.trend}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function Prompts({ a }) {
  const [cluster, setCluster] = useState('')
  const [stake, setStake] = useState('')
  const named = (p) => PLATFORMS.some((pl) => p.platforms[pl]?.stakeMentioned)
  const shown = a.perPrompt.filter(
    (p) => (!cluster || p.cluster === cluster) && (!stake || (stake === 'Stake named' ? named(p) : !named(p))),
  )
  return (
    <section className="card">
      <h2>Prompt by prompt ({shown.length})</h2>
      <div className="filters">
        <Select label="Cluster" value={cluster} onChange={setCluster} options={a.clusters} />
        <Select label="Stake in answer" value={stake} onChange={setStake} options={['Stake named', 'Stake not named']} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Prompt</th><th>Cluster</th>
              <th>ChatGPT names Stake</th><th className="num">Searched</th><th className="num">Sources</th><th>ChatGPT brands</th>
              <th>AI Mode names Stake</th><th className="num">Sources</th><th>AI Mode brands</th>
              <th>Shared sites</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const c = p.platforms.ChatGPT
              const g = p.platforms['Google AI Mode']
              return (
                <tr key={p.id}>
                  <td>{p.prompt}</td>
                  <td>{p.cluster}</td>
                  <td>{c ? yesNo(c.stakeMentioned) : ''}</td>
                  <td className="num">{c?.searched ?? ''}</td>
                  <td className="num">{c?.sources ?? ''}</td>
                  <td>{c?.brands.join(', ')}</td>
                  <td>{g ? yesNo(g.stakeMentioned) : ''}</td>
                  <td className="num">{g?.sources ?? ''}</td>
                  <td>{g?.brands.join(', ')}</td>
                  <td>{p.sharedSites?.join(', ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
