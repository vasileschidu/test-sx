export function SectionCard({ title, subtitle, children }) {
  return (
    <section className="section-card">
      <div className="section-card-header">
        <h3>{title}</h3>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
