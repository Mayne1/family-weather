export const metadata = { robots: { index: false, follow: false } };

export default function MobileQaPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: 24, background: "#dce7e3" }}>
    <iframe title="Family Weather phone preview" src="/" style={{ width: 390, height: 844, border: "10px solid #12241f", borderRadius: 28, background: "white" }} />
  </main>;
}
