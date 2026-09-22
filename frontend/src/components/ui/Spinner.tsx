import './Spinner.css'

/**
 * Modern LeetCode-style loading indicator: a thin dual-tone ring plus
 * an optional message. Use `fullPage` for route-level loads (centers in
 * the viewport) or the default inline block for section/table loads.
 */
function Spinner({ size = 40, label, fullPage = false, className = '' }) {
  const content = (
    <div className={`lc-spinner-block ${className}`} role="status" aria-live="polite">
      <span
        className="lc-spinner"
        style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 10)) }}
        aria-hidden="true"
      />
      {label && <p className="lc-spinner-label">{label}</p>}
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  )

  if (!fullPage) return content

  return <div className="lc-spinner-fullpage">{content}</div>
}

export default Spinner
