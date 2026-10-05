// Shared building blocks: stat tile, horizontal bars, select.

// Colour follows the entity (platform or source type), never its position in a chart.
const SERIES_CLASS = {
  ChatGPT: 'series-chatgpt',
  'Google AI Mode': 'series-aimode',
  'Stake-owned': 'type-stake',
  'Competitor operators': 'type-operator',
  'Affiliate, review and niche sites': 'type-affiliate',
  'News and sports media': 'type-news',
  'Regulator, government, safer gambling': 'type-regulator',
  'Community and user reviews': 'type-community',
  'Crypto and finance': 'type-reference',
  Other: 'type-other',
}

export function Tile({ label, value, note }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {note && <div className="tile-note">{note}</div>}
    </div>
  )
}

// Horizontal bars. `segments` is [{ key, value }] per row; one segment = plain ink bar.
// `unit` is appended to values, `highlight` marks one row label, `hideTotal` suits 100% stacks.
export function Bars({ rows, max, legend, caption, unit = '', highlight, hideTotal }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)))
  return (
    <figure className="bars">
      {legend && (
        <div className="legend">
          {legend.map((name, i) => (
            <span key={name}>
              <i className={`swatch ${SERIES_CLASS[name] || `series-${i + 1}`}`} />
              {name}
            </span>
          ))}
        </div>
      )}
      {rows.map((row) => {
        const total = row.segments.reduce((s, x) => s + x.value, 0)
        return (
          <div className="bar-row" key={row.label}>
            <div className="bar-label" title={row.label}>
              {row.label === highlight ? <strong className="u-lm">{row.label}</strong> : row.label}
            </div>
            <div className="bar-track">
              {row.segments.map(
                (seg, i) =>
                  seg.value > 0 && (
                    <div
                      key={seg.key}
                      className={`bar ${legend ? SERIES_CLASS[seg.key] || `series-${i + 1}` : 'series-ink'}`}
                      style={{ width: `${(seg.value / top) * 100}%` }}
                      tabIndex={0}
                      data-tip={`${seg.key}: ${seg.value}${unit}`}
                    />
                  ),
              )}
              {!hideTotal && <span className="bar-value">{row.note ?? `${Math.round(total * 10) / 10}${unit}`}</span>}
            </div>
          </div>
        )
      })}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

export function Select({ label, value, options, onChange, all = 'All' }) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {all && <option value="">{all}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}
