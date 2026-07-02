import { useState, useEffect, useRef, useCallback } from "react";

// ── LICENSE GATE ──────────────────────────────────────────────────────────────
const APP_META = {
  name: "PharmaCare Pro",
  version: "1.0.0",
  developer: "Built with EagleEyE Tech Suite",
  licenseKey: "PHARMA-2026-GCORP", // default valid key
};

function hashKey(k) {
  let h = 0;
  for (let i = 0; i < k.length; i++) h = ((h << 5) - h + k.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).toUpperCase();
}
const VALID_KEYS = ["PHARMA-2026-GCORP", "PHARMA-PRO-2026X", "EAGLEEYE-PHARMA1"];

// ── DATA HELPERS ──────────────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) { if (!d) return ""; const dt = new Date(d); return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function fmtMoney(n) { return "GH₵ " + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function isExpiringSoon(exp) { if (!exp) return false; const d = new Date(exp); const now = new Date(); const diff = (d - now) / 86400000; return diff >= 0 && diff <= 30; }
function isExpired(exp) { if (!exp) return false; return new Date(exp) < new Date(); }

const CATEGORIES = ["Antibiotics","Analgesics","Antifungals","Antivirals","Vitamins & Supplements","Cardiovascular","Diabetes","Dermatology","Gastrointestinal","Respiratory","Mental Health","Ophthalmology","Ear & Nose","Pediatrics","Gynecology","Urology","Oncology","Vaccines","Herbal/Traditional","Other"];
const UNITS = ["Tablet(s)","Capsule(s)","Bottle(s)","Sachet(s)","Vial(s)","Tube(s)","Ampoule(s)","Strip(s)","Piece(s)","ml","g","Other"];

// ── SEED DATA ─────────────────────────────────────────────────────────────────
const SEED_DRUGS = [];

// ── ICONS (SVG inline) ────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    pill: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
    cart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
    receipt: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M16 16H8"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    supplier: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    patient: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    warning: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    print: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    key: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  };
  return icons[name] || null;
};

// ── PRINT RECEIPT UTILITY ─────────────────────────────────────────────────────
function printReceipt(sale, drugs, settings) {
  const items = sale.items.map(it => {
    const drug = drugs.find(d => d.id === it.drugId);
    return { name: drug?.name || it.drugName || "Unknown", qty: it.qty, price: it.price, total: it.qty * it.price };
  });
  const html = `<!DOCTYPE html><html><head><title>Receipt #${sale.receiptNo}</title>
  <style>
    body{font-family:'Courier New',monospace;max-width:320px;margin:0 auto;padding:16px;font-size:12px}
    h2{text-align:center;font-size:16px;margin:4px 0}
    .center{text-align:center}
    .divider{border-top:1px dashed #000;margin:8px 0}
    table{width:100%;border-collapse:collapse}
    td{padding:2px 0}
    .right{text-align:right}
    .bold{font-weight:bold}
    .total-row td{font-size:14px;font-weight:bold;border-top:1px solid #000;padding-top:4px}
    @media print{body{max-width:none}}
  </style></head><body>
  <h2>${settings.pharmacyName || "PharmaCare Pro"}</h2>
  <p class="center">${settings.address || "Pharmacy Address"}</p>
  <p class="center">Tel: ${settings.phone || "---"}</p>
  ${settings.licenseNo ? `<p class="center">License No: ${settings.licenseNo}</p>` : ""}
  <div class="divider"></div>
  <p><b>Receipt #:</b> ${sale.receiptNo}</p>
  <p><b>Date:</b> ${fmtDate(sale.date)} ${sale.time || ""}</p>
  <p><b>Customer:</b> ${sale.customerName || "Walk-in"}</p>
  ${sale.prescriptionNo ? `<p><b>Rx No:</b> ${sale.prescriptionNo}</p>` : ""}
  <div class="divider"></div>
  <table>
    <tr><td class="bold">Item</td><td class="bold right">Qty</td><td class="bold right">Price</td><td class="bold right">Total</td></tr>
    ${items.map(it => `<tr><td>${it.name}</td><td class="right">${it.qty}</td><td class="right">${fmtMoney(it.price)}</td><td class="right">${fmtMoney(it.total)}</td></tr>`).join("")}
    <tr class="total-row"><td colspan="3">SUBTOTAL</td><td class="right">${fmtMoney(sale.subtotal)}</td></tr>
    ${sale.discount > 0 ? `<tr><td colspan="3">DISCOUNT (${sale.discountPct || 0}%)</td><td class="right">-${fmtMoney(sale.discount)}</td></tr>` : ""}
    <tr class="total-row"><td colspan="3">TOTAL</td><td class="right">${fmtMoney(sale.total)}</td></tr>
    <tr><td colspan="3">PAID (${sale.payMethod || "Cash"})</td><td class="right">${fmtMoney(sale.amtPaid)}</td></tr>
    ${sale.change > 0 ? `<tr><td colspan="3">CHANGE</td><td class="right">${fmtMoney(sale.change)}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <p class="center">Served by: ${sale.servedBy || "Pharmacist"}</p>
  <p class="center">${settings.footer || "Thank you for your patronage!"}</p>
  <p class="center" style="font-size:10px">Powered by PharmaCare Pro</p>
  </body></html>`;
  const w = window.open("", "_blank", "width=400,height=600");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function PharmacyApp() {
  // LICENSE
  const [licensed, setLicensed] = useState(() => LS.get("pharma_licensed", false));
  // ── Auto-activate from portal launch URL ──────────────────────────────
  useEffect(() => {
    const urlKey = new URLSearchParams(window.location.search).get('key');
    if (urlKey && !licensed) {
      const k = urlKey.toUpperCase().trim();
      if (/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) {
        LS.set("pharma_licensed", true);
        LS.set("pharma_licence_key", k);
        setLicensed(true);
        window.history.replaceState({},document.title,window.location.pathname);
      }
    }
  }, []);
  const [licInput, setLicInput] = useState("");
  const [licError, setLicError] = useState("");

  // AUTH (PIN)
  const [pinSetup, setPinSetup] = useState(() => LS.get("pharma_pin", null));
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // DATA
  const [drugs, setDrugs] = useState(() => LS.get("pharma_drugs", SEED_DRUGS));
  const [sales, setSales] = useState(() => LS.get("pharma_sales", []));
  const [suppliers, setSuppliers] = useState(() => LS.get("pharma_suppliers", [
    { id: uid(), name: "PharmaCo Ghana", contact: "0244000001", email: "info@pharmacogh.com", address: "Accra, Ghana", notes: "" },
    { id: uid(), name: "Kinapharma", contact: "0244000002", email: "sales@kinapharma.com", address: "Kumasi, Ghana", notes: "" },
  ]));
  const [patients, setPatients] = useState(() => LS.get("pharma_patients", []));
  const [settings, setSettings] = useState(() => LS.get("pharma_settings", {
    pharmacyName: "PharmaCare Pro",
    address: "",
    phone: "",
    licenseNo: "",
    footer: "Thank you for your patronage!",
    currency: "GH₵",
    taxRate: 0,
  }));

  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState(null);

  // Persist
  useEffect(() => { LS.set("pharma_drugs", drugs); }, [drugs]);
  useEffect(() => { LS.set("pharma_sales", sales); }, [sales]);
  useEffect(() => { LS.set("pharma_suppliers", suppliers); }, [suppliers]);
  useEffect(() => { LS.set("pharma_patients", patients); }, [patients]);
  useEffect(() => { LS.set("pharma_settings", settings); }, [settings]);
  useEffect(() => { if (licensed) LS.set("pharma_licensed", true); }, [licensed]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── LICENSE SCREEN ──────────────────────────────────────────────────────────
  if (!licensed) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a2342 0%,#1a4a7a 60%,#0d6e4f 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "48px 40px", width: 400, maxWidth: "95vw", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#00c896,#0070f3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Icon name="pill" size={32} color="#fff" />
          </div>
          <h1 style={{ color: "#fff", fontSize: 26, margin: "0 0 4px" }}>PharmaCare Pro</h1>
          <p style={{ color: "#94b8d0", fontSize: 13, margin: "0 0 32px" }}>Pharmacy Management System</p>
          <div style={{ textAlign: "left", marginBottom: 16 }}>
            <label style={{ color: "#cbd5e1", fontSize: 13, display: "block", marginBottom: 6 }}>Enter License Key</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={licInput} onChange={e => setLicInput(e.target.value.toUpperCase())}
                placeholder="PHARMA-XXXX-XXXXX"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, outline: "none", letterSpacing: 1 }}
                onKeyDown={e => e.key === "Enter" && handleLicenseSubmit()}
              />
              <button onClick={() => {
                if (VALID_KEYS.includes(licInput.trim())) { setLicensed(true); } else { setLicError("Invalid license key. Please check and try again."); }
              }} style={{ padding: "10px 16px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                <Icon name="key" size={16} color="#fff" />
              </button>
            </div>
            {licError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{licError}</p>}
          </div>
          <div style={{ padding: "12px 16px", background: "rgba(0,200,150,0.1)", borderRadius: 10, border: "1px solid rgba(0,200,150,0.2)", textAlign: "left" }}>
            <p style={{ color: "#6ee7c7", fontSize: 12, margin: 0 }}>Demo key: <b style={{ letterSpacing: 1 }}>PHARMA-2026-GCORP</b></p>
          </div>
          <p style={{ color: "#475569", fontSize: 11, marginTop: 20 }}>© 2026 PharmaCare Pro · Powered by EagleEyE Tech Suite</p>
        </div>
      </div>
    );
  }

  // ── PIN AUTH ────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a2342 0%,#1a4a7a 60%,#0d6e4f 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "48px 40px", width: 380, maxWidth: "95vw", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#00c896,#0070f3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icon name="lock" size={26} color="#fff" />
          </div>
          <h2 style={{ color: "#fff", margin: "0 0 4px" }}>{!pinSetup ? "Create PIN" : "Enter PIN"}</h2>
          <p style={{ color: "#94b8d0", fontSize: 13, margin: "0 0 28px" }}>PharmaCare Pro</p>

          {!pinSetup ? (
            <div style={{ textAlign: "left" }}>
              <label style={{ color: "#cbd5e1", fontSize: 13 }}>Set 4-digit PIN</label>
              <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: "12px", marginTop: 6, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 20, textAlign: "center", letterSpacing: 8, outline: "none", boxSizing: "border-box" }} />
              <label style={{ color: "#cbd5e1", fontSize: 13, display: "block", marginTop: 12 }}>Confirm PIN</label>
              <input type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: "12px", marginTop: 6, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 20, textAlign: "center", letterSpacing: 8, outline: "none", boxSizing: "border-box" }} />
              {pinError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{pinError}</p>}
              <button onClick={() => {
                if (newPin.length !== 4) return setPinError("PIN must be 4 digits");
                if (newPin !== confirmPin) return setPinError("PINs do not match");
                const h = hashKey(newPin);
                LS.set("pharma_pin", h);
                setPinSetup(h);
                setAuthed(true);
              }} style={{ width: "100%", marginTop: 16, padding: "13px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Create PIN & Enter
              </button>
            </div>
          ) : (
            <div>
              <input type="password" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                style={{ width: "100%", padding: "14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 28, textAlign: "center", letterSpacing: 12, outline: "none", boxSizing: "border-box" }}
                onKeyDown={e => { if (e.key === "Enter") { if (hashKey(pinInput) === pinSetup) { setAuthed(true); setPinInput(""); } else { setPinError("Wrong PIN"); setPinInput(""); } }}}
                autoFocus
              />
              {pinError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{pinError}</p>}
              <button onClick={() => {
                if (hashKey(pinInput) === pinSetup) { setAuthed(true); setPinInput(""); setPinError(""); }
                else { setPinError("Wrong PIN"); setPinInput(""); }
              }} style={{ width: "100%", marginTop: 14, padding: "13px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Unlock
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  const navItems = [
    { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { id: "inventory", label: "Inventory",    icon: "pill" },
    { id: "sales",     label: "New Sale",     icon: "cart" },
    { id: "history",   label: "Sales History",icon: "receipt" },
    { id: "patients",  label: "Patients",     icon: "patient" },
    { id: "suppliers", label: "Suppliers",    icon: "supplier" },
    { id: "reports",   label: "Reports",      icon: "chart" },
    { id: "backup",    label: "Backup & Restore", icon: "download" },
    { id: "settings",  label: "Settings",     icon: "settings" },
  ];

  const lowStock = drugs.filter(d => d.qty <= d.reorderLevel);
  const expiredDrugs = drugs.filter(d => isExpired(d.expiry));
  const expiringSoon = drugs.filter(d => !isExpired(d.expiry) && isExpiringSoon(d.expiry));
  const todaySales = sales.filter(s => s.date === today());
  const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI',sans-serif", background: "#f0f4f8", color: "#1a2744" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 230, background: "linear-gradient(180deg,#0a2342 0%,#0f3460 100%)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, boxShadow: "3px 0 20px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#00c896,#0070f3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="pill" size={20} color="#fff" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, lineHeight: 1 }}>PharmaCare</div>
              <div style={{ color: "#00c896", fontSize: 11 }}>Pro Edition</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: page === n.id ? "rgba(0,200,150,0.15)" : "transparent", color: page === n.id ? "#00c896" : "#94b8d0", fontWeight: page === n.id ? 700 : 400, fontSize: 14, cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "all 0.15s" }}>
              <Icon name={n.icon} size={17} color={page === n.id ? "#00c896" : "#94b8d0"} />
              {n.label}
              {n.id === "inventory" && (lowStock.length > 0 || expiredDrugs.length > 0) && (
                <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: 20, fontSize: 10, padding: "1px 6px" }}>{lowStock.length + expiredDrugs.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "#475569", fontSize: 11, margin: "0 0 8px" }}>{settings.pharmacyName}</p>
          <button onClick={() => { setAuthed(false); setPinInput(""); }} style={{ display: "flex", alignItems: "center", gap: 8, color: "#94b8d0", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            <Icon name="logout" size={15} color="#94b8d0" /> Lock Screen
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: 230, flex: 1, padding: "24px 28px", minHeight: "100vh" }}>
        {/* TOAST */}
        {toast && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.type === "success" ? "#00c896" : "#ef4444", color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={toast.type === "success" ? "check" : "warning"} size={16} color="#fff" />
            {toast.msg}
          </div>
        )}

        {page === "dashboard" && <Dashboard drugs={drugs} sales={sales} lowStock={lowStock} expiredDrugs={expiredDrugs} expiringSoon={expiringSoon} todayRevenue={todayRevenue} todaySales={todaySales} setPage={setPage} />}
        {page === "inventory" && <Inventory drugs={drugs} setDrugs={setDrugs} suppliers={suppliers} showToast={showToast} />}
        {page === "sales" && <SalesTerminal drugs={drugs} setDrugs={setDrugs} sales={sales} setSales={setSales} patients={patients} settings={settings} showToast={showToast} />}
        {page === "history" && <SalesHistory sales={sales} setSales={setSales} drugs={drugs} settings={settings} showToast={showToast} />}
        {page === "patients" && <Patients patients={patients} setPatients={setPatients} showToast={showToast} />}
        {page === "suppliers" && <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} showToast={showToast} />}
        {page === "reports" && <Reports sales={sales} drugs={drugs} />}
        {page === "settings" && <Settings settings={settings} setSettings={setSettings} showToast={showToast} pinSetup={pinSetup} setPinSetup={setPinSetup} />}
        {page === "backup" && <PharmaBackup drugs={drugs} sales={sales} suppliers={suppliers} patients={patients} settings={settings} onRestore={d => { if(d.drugs) setDrugs(d.drugs); if(d.sales) setSales(d.sales); if(d.suppliers) setSuppliers(d.suppliers); if(d.patients) setPatients(d.patients); if(d.settings) setSettings(d.settings); }} showToast={showToast} />}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
// ─── BACKUP & RESTORE ────────────────────────────────────────────────────────

// ── INSTITUTION HELPERS (Update 5) ───────────────────────────────────────────
function loadInstitution(key) {
  try { return JSON.parse(localStorage.getItem(key + "_inst")) || { name: "", address: "" }; } catch { return { name: "", address: "" }; }
}
function saveInstitution(key, inst) {
  try { localStorage.setItem(key + "_inst", JSON.stringify(inst)); } catch {}
}


// ── LICENCE EXPIRY BANNER (Update 8) ─────────────────────────────────────────
function ExpiryBanner({ expiry, phone }) {
  if (!expiry || expiry === "—") return null;
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days > 30) return null;
  const bg  = days <= 7 ? "#dc2626" : "#d97706";
  const msg = days <= 0
    ? `Licence has expired — contact ${phone||"0597147460"} to renew`
    : days <= 7
      ? `⚠ Licence expires in ${days} day${days!==1?"s":""} — renew immediately`
      : `Licence expires in ${days} day${days!==1?"s":""} — contact ${phone||"0597147460"} to renew`;
  return (
    <div style={{ background: bg, color: "#fff", textAlign: "center", padding: "7px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
      {msg}
    </div>
  );
}


// ── RESET MODAL (Update 1) ───────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel, adminPin, accent, cardBg }) {
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [step, setStep] = useState(1);
  const check = () => { if (pin !== String(adminPin)) { setErr("Incorrect PIN."); return; } setStep(2); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
      <div style={{ background: cardBg||"#1f2330", border:"1px solid #ef444455", borderRadius:14, padding:28, width:"min(94vw,400px)" }}>
        {step === 1 ? (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>🔐 Admin PIN Required</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:16 }}>Enter your admin PIN to access the reset function.</p>
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&check()} placeholder="••••" autoFocus
            style={{ width:"100%", padding:12, background:"rgba(255,255,255,0.06)", border:`1.5px solid ${err?"#ef4444":"rgba(255,255,255,0.15)"}`, borderRadius:8, color:"#fff", fontSize:20, textAlign:"center", letterSpacing:6, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"inherit" }} />
          {err && <div style={{ color:"#fca5a5", fontSize:12, marginBottom:8 }}>{err}</div>}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button onClick={onCancel} style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={check}    style={{ flex:1, padding:"10px 0", background:accent||"#2E86AB", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Verify PIN</button>
          </div>
        </>) : (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>⚠️ Confirm Full Reset</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:6, lineHeight:1.7 }}>This will <strong style={{ color:"#ef4444" }}>permanently delete ALL data</strong> in this app — records, settings, everything.</p>
          <p style={{ fontSize:13, color:"#ef4444", fontWeight:700, marginBottom:20 }}>This cannot be undone.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel}  style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:"10px 0", background:"#dc2626", color:"#fff", border:"none", borderRadius:8, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Delete All Data</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

function PharmaBackup({ drugs, sales, suppliers, patients, settings, onRestore, showToast }) {
  const [confirmRestore, setConfirmRestore] = useState(null);
  const fileRef = useRef(null);

  const download = () => {
    const blob = new Blob([JSON.stringify({ app: "PharmaCare Pro", exportedAt: new Date().toISOString(), version: 1, data: { drugs, sales, suppliers, patients, settings } }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `PharmaCare-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    showToast(`Backup downloaded — ${drugs.length} drugs, ${sales.length} sales records.`, "success");
  };

  const onFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try {
      const p = JSON.parse(reader.result);
      if (!p.data?.drugs) { showToast("Not a valid PharmaCare Pro backup file.", "error"); return; }
      setConfirmRestore(p);
    } catch { showToast("Could not read file.", "error"); } };
    reader.readAsText(file); e.target.value = "";
  };

  const exportCSV = () => {
    const rows = [["Name", "Category", "Unit", "Qty", "Reorder Level", "Cost (GH₵)", "Selling Price (GH₵)", "Batch No", "Expiry", "Supplier"]];
    drugs.forEach(d => rows.push([d.name, d.category, d.unit, d.qty, d.reorderLevel, d.costPrice, d.sellingPrice, d.batchNo||"", d.expiry||"", d.supplier||""]));
    const csv = rows.map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `PharmaCare-inventory-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    showToast("Drug inventory CSV exported.", "success");
  };

  const S = {
    wrap: { padding: "28px 32px", maxWidth: 740 },
    card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05)" },
    title: { fontWeight: 800, fontSize: 15, color: "#0a2342", marginBottom: 8 },
    desc: { fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.6 },
  };

  return (
    <div style={S.wrap}>
      <div style={{ fontWeight: 800, fontSize: 20, color: "#0a2342", marginBottom: 6 }}>💾 Backup & Restore</div>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
        All pharmacy data — drug inventory, sales, suppliers, patients — is saved in this browser. Download a backup regularly and store it somewhere safe. You can restore from any backup, even years later.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={S.card}>
          <div style={S.title}>⬇️ Export Full Backup</div>
          <p style={S.desc}>Downloads all data as a single .json file. Store it in Google Drive, email, or USB.</p>
          <button onClick={download} style={{ width: "100%", background: "linear-gradient(135deg,#00c896,#0070f3)", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>⬇️ Download Backup (.json)</button>
        </div>
        <div style={S.card}>
          <div style={S.title}>⬆️ Restore from Backup</div>
          <p style={S.desc}>Select a previously downloaded PharmaCare .json backup to restore all records.</p>
          <label style={{ display: "block", textAlign: "center", padding: "11px 0", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#64748b" }}>
            📂 Choose Backup File…
            <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onFile} />
          </label>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.title}>📊 Export Drug Inventory to CSV</div>
        <p style={S.desc}>Export your full drug list as a spreadsheet — useful for audits, stock-takes, and regulatory checks.</p>
        <button onClick={exportCSV} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📊 Export Drug Inventory CSV</button>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Current Data Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[["Drugs", drugs.length], ["Sales Records", sales.length], ["Suppliers", suppliers.length], ["Patients", patients.length]].map(([l,v]) => (
            <div key={l} style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "14px 0" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0070f3" }}>{v}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {confirmRestore && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }} onClick={() => setConfirmRestore(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0a2342", marginBottom: 10 }}>⚠️ Confirm Restore</div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Backup from <strong style={{ color: "#1e293b" }}>{new Date(confirmRestore.exportedAt).toLocaleString()}</strong></p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>This replaces ALL current pharmacy data with the backup. This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmRestore(null)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 0", color: "#64748b", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { onRestore(confirmRestore.data); setConfirmRestore(null); showToast("Pharmacy data restored successfully.", "success"); }} style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer" }}>✅ Yes, Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ drugs, sales, lowStock, expiredDrugs, expiringSoon, todayRevenue, todaySales, setPage }) {
  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const weekSales = sales.filter(s => { const d = new Date(s.date); const now = new Date(); return (now - d) / 86400000 <= 7; });
  const weekRevenue = weekSales.reduce((s, x) => s + x.total, 0);

  const StatCard = ({ label, value, sub, color, icon, onClick }) => (
    <div onClick={onClick} style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: onClick ? "pointer" : "default", borderLeft: `4px solid ${color}`, transition: "transform 0.15s", display: "flex", flexDirection: "column", gap: 8 }}
      onMouseOver={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseOut={e => (e.currentTarget.style.transform = "none")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={22} color={color} />
        </div>
      </div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );

  const recentSales = [...sales].sort((a, b) => b.id > a.id ? 1 : -1).slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Dashboard</h1>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Today's Revenue" value={fmtMoney(todayRevenue)} sub={`${todaySales.length} sale(s) today`} color="#00c896" icon="chart" />
        <StatCard label="Week Revenue" value={fmtMoney(weekRevenue)} sub={`${sales.length} total sales`} color="#0070f3" icon="receipt" />
        <StatCard label="Total Drugs" value={drugs.length} sub={`${drugs.filter(d => d.qty > 0).length} in stock`} color="#8b5cf6" icon="pill" onClick={() => setPage("inventory")} />
        <StatCard label="Low Stock" value={lowStock.length} sub="Below reorder level" color="#f59e0b" icon="warning" onClick={() => setPage("inventory")} />
        <StatCard label="Expired / Expiring" value={expiredDrugs.length + " / " + expiringSoon.length} sub="Needs attention" color="#ef4444" icon="warning" onClick={() => setPage("inventory")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent sales */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Recent Sales</h3>
          {recentSales.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 14 }}>No sales yet</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Receipt", "Customer", "Date", "Total"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 0", color: "#64748b", fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recentSales.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "8px 0", color: "#0070f3", fontWeight: 600 }}>{s.receiptNo}</td>
                    <td style={{ padding: "8px 0" }}>{s.customerName || "Walk-in"}</td>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>{fmtDate(s.date)}</td>
                    <td style={{ padding: "8px 0", fontWeight: 700, color: "#00c896" }}>{fmtMoney(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alerts */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Alerts</h3>
          {lowStock.length === 0 && expiredDrugs.length === 0 && expiringSoon.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#00c896" }}><Icon name="check" size={18} color="#00c896" /> All clear! No alerts.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {expiredDrugs.slice(0, 3).map(d => (
                <div key={d.id} style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", borderLeft: "3px solid #ef4444", fontSize: 13 }}>
                  <b style={{ color: "#ef4444" }}>EXPIRED</b> — {d.name} <span style={{ color: "#64748b" }}>(exp {fmtDate(d.expiry)})</span>
                </div>
              ))}
              {expiringSoon.slice(0, 3).map(d => (
                <div key={d.id} style={{ padding: "10px 14px", borderRadius: 8, background: "#fffbeb", borderLeft: "3px solid #f59e0b", fontSize: 13 }}>
                  <b style={{ color: "#f59e0b" }}>EXPIRING SOON</b> — {d.name} <span style={{ color: "#64748b" }}>(exp {fmtDate(d.expiry)})</span>
                </div>
              ))}
              {lowStock.slice(0, 3).map(d => (
                <div key={d.id} style={{ padding: "10px 14px", borderRadius: 8, background: "#fff7ed", borderLeft: "3px solid #f97316", fontSize: 13 }}>
                  <b style={{ color: "#f97316" }}>LOW STOCK</b> — {d.name} <span style={{ color: "#64748b" }}>({d.qty} left)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ══════════════════════════════════════════════════════════════════════════════
function Inventory({ drugs, setDrugs, suppliers, showToast }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [modal, setModal] = useState(null); // null | "add" | drug object
  const [form, setForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  const blank = { name: "", category: "Antibiotics", unit: "Tablet(s)", costPrice: "", sellingPrice: "", qty: "", reorderLevel: 20, batchNo: "", expiry: "", supplier: "", description: "" };

  const filtered = drugs.filter(d => {
    const q = search.toLowerCase();
    return (catFilter === "All" || d.category === catFilter) &&
      (d.name.toLowerCase().includes(q) || d.batchNo?.toLowerCase().includes(q) || d.supplier?.toLowerCase().includes(q));
  });

  function openAdd() { setForm({ ...blank }); setModal("add"); }
  function openEdit(d) { setForm({ ...d }); setModal(d.id); }
  function save() {
    if (!form.name || !form.sellingPrice || form.qty === "") return showToast("Fill in required fields", "error");
    if (modal === "add") {
      setDrugs(prev => [...prev, { ...form, id: uid(), qty: Number(form.qty), costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), reorderLevel: Number(form.reorderLevel) }]);
      showToast("Drug added to inventory");
    } else {
      setDrugs(prev => prev.map(d => d.id === modal ? { ...form, id: modal, qty: Number(form.qty), costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), reorderLevel: Number(form.reorderLevel) } : d));
      showToast("Drug updated");
    }
    setModal(null);
  }

  const F = ({ label, name, type = "text", options, required }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{label}{required && " *"}</label>
      {options ? (
        <select value={form[name] || ""} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[name] ?? ""} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );

  const statusBadge = (d) => {
    if (isExpired(d.expiry)) return <span style={{ padding: "2px 8px", borderRadius: 20, background: "#fef2f2", color: "#ef4444", fontSize: 11, fontWeight: 700 }}>EXPIRED</span>;
    if (isExpiringSoon(d.expiry)) return <span style={{ padding: "2px 8px", borderRadius: 20, background: "#fffbeb", color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>EXP. SOON</span>;
    if (d.qty === 0) return <span style={{ padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#94a3b8", fontSize: 11 }}>OUT OF STOCK</span>;
    if (d.qty <= d.reorderLevel) return <span style={{ padding: "2px 8px", borderRadius: 20, background: "#fff7ed", color: "#f97316", fontSize: 11, fontWeight: 700 }}>LOW STOCK</span>;
    return <span style={{ padding: "2px 8px", borderRadius: 20, background: "#f0fdf4", color: "#00c896", fontSize: 11 }}>In Stock</span>;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Drug Inventory</h1>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          <Icon name="plus" size={16} color="#fff" /> Add Drug
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "#fff", borderRadius: 10, padding: "10px 14px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <Icon name="search" size={16} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drugs, batch no, supplier..." style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, outline: "none" }}>
          <option>All</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Drug Name", "Category", "Batch No", "Qty", "Cost", "Price", "Expiry", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No drugs found</td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: "10px 16px", color: "#64748b" }}>{d.category}</td>
                  <td style={{ padding: "10px 16px", color: "#64748b" }}>{d.batchNo}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: d.qty <= d.reorderLevel ? "#f97316" : "#1a2744" }}>{d.qty} {d.unit}</td>
                  <td style={{ padding: "10px 16px", color: "#64748b" }}>{fmtMoney(d.costPrice)}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: "#0070f3" }}>{fmtMoney(d.sellingPrice)}</td>
                  <td style={{ padding: "10px 16px", color: isExpired(d.expiry) ? "#ef4444" : "#64748b" }}>{fmtDate(d.expiry)}</td>
                  <td style={{ padding: "10px 16px" }}>{statusBadge(d)}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(d)} style={{ padding: "5px 10px", borderRadius: 7, background: "#eff6ff", border: "none", cursor: "pointer", color: "#0070f3" }}><Icon name="edit" size={14} color="#0070f3" /></button>
                      <button onClick={() => setConfirmDel(d.id)} style={{ padding: "5px 10px", borderRadius: 7, background: "#fef2f2", border: "none", cursor: "pointer", color: "#ef4444" }}><Icon name="trash" size={14} color="#ef4444" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{modal === "add" ? "Add New Drug" : "Edit Drug"}</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="x" size={20} color="#64748b" /></button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div style={{ gridColumn: "1/-1" }}><F label="Drug Name" name="name" required /></div>
                <F label="Category" name="category" options={CATEGORIES} />
                <F label="Unit" name="unit" options={UNITS} />
                <F label="Cost Price (GH₵)" name="costPrice" type="number" />
                <F label="Selling Price (GH₵)" name="sellingPrice" type="number" required />
                <F label="Quantity in Stock" name="qty" type="number" required />
                <F label="Reorder Level" name="reorderLevel" type="number" />
                <F label="Batch Number" name="batchNo" />
                <F label="Expiry Date" name="expiry" type="date" />
                <div style={{ gridColumn: "1/-1" }}><F label="Supplier" name="supplier" /></div>
                <div style={{ gridColumn: "1/-1" }}><F label="Description / Notes" name="description" /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={save} style={{ flex: 2, padding: "11px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{modal === "add" ? "Add Drug" : "Save Changes"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 340 }}>
            <h3 style={{ margin: "0 0 10px" }}>Delete Drug?</h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { setDrugs(p => p.filter(d => d.id !== confirmDel)); setConfirmDel(null); showToast("Drug deleted"); }} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SALES TERMINAL (POS)
// ══════════════════════════════════════════════════════════════════════════════
function SalesTerminal({ drugs, setDrugs, sales, setSales, patients, settings, showToast }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [discountPct, setDiscountPct] = useState(0);
  const [amtPaid, setAmtPaid] = useState("");
  const [notes, setNotes] = useState("");

  const searchResults = search.length >= 1 ? drugs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) && d.qty > 0 && !isExpired(d.expiry)).slice(0, 8) : [];

  function addToCart(drug) {
    setCart(prev => {
      const ex = prev.find(c => c.drugId === drug.id);
      if (ex) return prev.map(c => c.drugId === drug.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { drugId: drug.id, drugName: drug.name, price: drug.sellingPrice, qty: 1, unit: drug.unit, max: drug.qty }];
    });
    setSearch("");
  }

  function updateQty(drugId, qty) {
    if (qty < 1) return;
    const drug = drugs.find(d => d.id === drugId);
    if (qty > drug.qty) return showToast(`Only ${drug.qty} in stock`, "error");
    setCart(prev => prev.map(c => c.drugId === drugId ? { ...c, qty } : c));
  }

  function removeItem(drugId) { setCart(prev => prev.filter(c => c.drugId !== drugId)); }

  const subtotal = cart.reduce((s, c) => s + c.qty * c.price, 0);
  const discount = subtotal * (discountPct / 100);
  const total = subtotal - discount;
  const change = Number(amtPaid) - total;

  function completeSale() {
    if (cart.length === 0) return showToast("Cart is empty", "error");
    if (!amtPaid || Number(amtPaid) < total) return showToast("Amount paid is insufficient", "error");

    const receiptNo = "RX" + String(sales.length + 1).padStart(5, "0");
    const now = new Date();
    const sale = {
      id: uid(), receiptNo, date: today(), time: now.toTimeString().slice(0, 5),
      customerName, prescriptionNo, payMethod, items: cart,
      subtotal, discount, discountPct: Number(discountPct), total, amtPaid: Number(amtPaid), change: Math.max(0, change),
      notes, servedBy: settings.pharmacyName || "Pharmacist",
    };

    // Deduct stock
    setDrugs(prev => prev.map(d => {
      const item = cart.find(c => c.drugId === d.id);
      return item ? { ...d, qty: d.qty - item.qty } : d;
    }));

    setSales(prev => [...prev, sale]);
    printReceipt(sale, drugs, settings);
    showToast(`Sale complete! Receipt ${receiptNo}`);

    // Reset
    setCart([]); setCustomerName(""); setPrescriptionNo(""); setAmtPaid(""); setDiscountPct(0); setNotes(""); setPayMethod("Cash");
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800 }}>New Sale — POS Terminal</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Search */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <Icon name="search" size={16} color="#94a3b8" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drug name to add to cart..."
                  style={{ border: "none", outline: "none", fontSize: 15, width: "100%" }} autoFocus />
              </div>
              {searchResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 50, maxHeight: 280, overflowY: "auto", border: "1px solid #e2e8f0", marginTop: 4 }}>
                  {searchResults.map(d => (
                    <div key={d.id} onClick={() => addToCart(d)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                      onMouseOver={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseOut={e => e.currentTarget.style.background = ""}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{d.category} · {d.qty} {d.unit} available</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#0070f3" }}>{fmtMoney(d.sellingPrice)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", flex: 1 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Cart Items</h3>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                <Icon name="cart" size={36} color="#e2e8f0" />
                <p style={{ marginTop: 10 }}>Search and add drugs above</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Drug", "Unit Price", "Qty", "Total", ""].map(h => <th key={h} style={{ padding: "6px 0", textAlign: "left", color: "#64748b" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cart.map(c => (
                    <tr key={c.drugId} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 0", fontWeight: 600 }}>{c.drugName}</td>
                      <td style={{ padding: "10px 0" }}>{fmtMoney(c.price)}</td>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => updateQty(c.drugId, c.qty - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 700 }}>-</button>
                          <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{c.qty}</span>
                          <button onClick={() => updateQty(c.drugId, c.qty + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding: "10px 0", fontWeight: 700, color: "#0070f3" }}>{fmtMoney(c.qty * c.price)}</td>
                      <td style={{ padding: "10px 0" }}>
                        <button onClick={() => removeItem(c.drugId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Icon name="x" size={16} color="#ef4444" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Customer Info */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Customer Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Customer Name</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in customer"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Prescription No.</label>
                <input value={prescriptionNo} onChange={e => setPrescriptionNo(e.target.value)} placeholder="Optional"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dosage instructions, notes..."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Order Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Order Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Items ({cart.length})</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Discount</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" value={discountPct} onChange={e => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))} min={0} max={100}
                    style={{ width: 50, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, textAlign: "center" }} />
                  <span style={{ fontSize: 12, color: "#64748b" }}>%</span>
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>-{fmtMoney(discount)}</span>
                </div>
              </div>
              <div style={{ borderTop: "2px solid #f1f5f9", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>TOTAL</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: "#00c896" }}>{fmtMoney(total)}</span>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Payment Method</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Cash", "MoMo", "Card", "Credit"].map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: payMethod === m ? "2px solid #00c896" : "1px solid #e2e8f0", background: payMethod === m ? "#f0fdf9" : "#fff", color: payMethod === m ? "#00c896" : "#64748b", fontWeight: payMethod === m ? 700 : 400, fontSize: 12, cursor: "pointer" }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Amount Paid (GH₵)</label>
              <input type="number" value={amtPaid} onChange={e => setAmtPaid(e.target.value)} placeholder="0.00"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "right" }} />
            </div>

            {amtPaid && Number(amtPaid) >= total && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "#f0fdf9", border: "1px solid #bbf7e0", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#065f46", fontWeight: 600 }}>Change</span>
                <span style={{ color: "#00c896", fontWeight: 800, fontSize: 16 }}>{fmtMoney(Math.max(0, change))}</span>
              </div>
            )}

            <button onClick={completeSale}
              style={{ width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, background: cart.length === 0 ? "#94a3b8" : "linear-gradient(135deg,#00c896,#0070f3)", border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: cart.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="print" size={18} color="#fff" /> Complete & Print Receipt
            </button>
          </div>

          {/* Quick drug summary */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>QUICK STOCK CHECK</h4>
            {drugs.filter(d => d.qty <= d.reorderLevel && d.qty > 0 && !isExpired(d.expiry)).slice(0, 5).map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span>{d.name}</span>
                <span style={{ color: "#f97316", fontWeight: 700 }}>{d.qty} left</span>
              </div>
            ))}
            {drugs.filter(d => d.qty <= d.reorderLevel).length === 0 && <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>All stock levels OK</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SALES HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function SalesHistory({ sales, setSales, drugs, settings, showToast }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState(null);

  const filtered = [...sales].reverse().filter(s => {
    const q = search.toLowerCase();
    const matchQ = s.receiptNo?.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q);
    const matchFrom = !dateFrom || s.date >= dateFrom;
    const matchTo = !dateTo || s.date <= dateTo;
    return matchQ && matchFrom && matchTo;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Sales History</h1>
        <div style={{ fontSize: 14, color: "#64748b" }}>{sales.length} total transactions</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: "#fff", borderRadius: 10, padding: "10px 14px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <Icon name="search" size={16} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Receipt no, customer name..." style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }} />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} />
      </div>

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Receipt No", "Date & Time", "Customer", "Items", "Total", "Paid By", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No sales found</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                <td style={{ padding: "10px 16px", fontWeight: 700, color: "#0070f3" }}>{s.receiptNo}</td>
                <td style={{ padding: "10px 16px", color: "#64748b" }}>{fmtDate(s.date)} {s.time}</td>
                <td style={{ padding: "10px 16px" }}>{s.customerName || "Walk-in"}</td>
                <td style={{ padding: "10px 16px", color: "#64748b" }}>{s.items?.length || 0} item(s)</td>
                <td style={{ padding: "10px 16px", fontWeight: 700, color: "#00c896" }}>{fmtMoney(s.total)}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, background: "#f0f9ff", color: "#0070f3", fontSize: 12 }}>{s.payMethod}</span>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setView(s)} style={{ padding: "5px 10px", borderRadius: 7, background: "#eff6ff", border: "none", cursor: "pointer", fontSize: 12, color: "#0070f3" }}>View</button>
                    <button onClick={() => printReceipt(s, drugs, settings)} style={{ padding: "5px 10px", borderRadius: 7, background: "#f0fdf9", border: "none", cursor: "pointer" }}><Icon name="print" size={13} color="#00c896" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sale Detail Modal */}
      {view && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: 520, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Receipt {view.receiptNo}</h3>
              <button onClick={() => setView(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="x" size={20} color="#64748b" /></button>
            </div>
            <div style={{ padding: "18px 22px", fontSize: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 16 }}>
                {[["Date", `${fmtDate(view.date)} ${view.time}`], ["Customer", view.customerName || "Walk-in"], ["Rx No.", view.prescriptionNo || "—"], ["Payment", view.payMethod]].map(([k, v]) => (
                  <div key={k}><span style={{ color: "#64748b" }}>{k}: </span><b>{v}</b></div>
                ))}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Drug", "Qty", "Unit Price", "Total"].map(h => <th key={h} style={{ padding: "6px 0", textAlign: "left", color: "#64748b" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {view.items?.map((it, i) => {
                    const d = drugs.find(x => x.id === it.drugId);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "8px 0" }}>{d?.name || it.drugName}</td>
                        <td style={{ padding: "8px 0" }}>{it.qty}</td>
                        <td style={{ padding: "8px 0" }}>{fmtMoney(it.price)}</td>
                        <td style={{ padding: "8px 0", fontWeight: 700 }}>{fmtMoney(it.qty * it.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 14, padding: 14, background: "#f8fafc", borderRadius: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><b>{fmtMoney(view.subtotal)}</b></div>
                {view.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}><span>Discount ({view.discountPct}%)</span><b>-{fmtMoney(view.discount)}</b></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16 }}><span>TOTAL</span><span style={{ color: "#00c896" }}>{fmtMoney(view.total)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Paid</span><b>{fmtMoney(view.amtPaid)}</b></div>
                {view.change > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Change</span><b>{fmtMoney(view.change)}</b></div>}
              </div>
              {view.notes && <p style={{ marginTop: 10, padding: 12, background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>Notes: {view.notes}</p>}
              <button onClick={() => printReceipt(view, drugs, settings)} style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 10, background: "#0070f3", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="print" size={16} color="#fff" /> Reprint Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ══════════════════════════════════════════════════════════════════════════════
function Patients({ patients, setPatients, showToast }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const blank = { name: "", dob: "", gender: "Male", phone: "", address: "", allergies: "", medHistory: "", notes: "" };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  function save() {
    if (!form.name) return showToast("Patient name required", "error");
    if (modal === "add") { setPatients(p => [...p, { ...form, id: uid() }]); showToast("Patient added"); }
    else { setPatients(p => p.map(x => x.id === modal ? { ...form, id: modal } : x)); showToast("Patient updated"); }
    setModal(null);
  }

  const F = ({ label, name, type = "text", options }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={form[name] || ""} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={form[name] || ""} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} rows={3}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box", resize: "vertical" }} />
      ) : (
        <input type={type} value={form[name] || ""} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Patient Records</h1>
        <button onClick={() => { setForm({ ...blank }); setModal("add"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          <Icon name="plus" size={16} color="#fff" /> Add Patient
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "10px 14px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <Icon name="search" size={16} color="#94a3b8" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {filtered.length === 0 ? <p style={{ color: "#94a3b8" }}>No patients found</p> : filtered.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="patient" size={22} color="#0070f3" />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setForm({ ...p }); setModal(p.id); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#eff6ff", border: "none", cursor: "pointer" }}><Icon name="edit" size={14} color="#0070f3" /></button>
                <button onClick={() => { setPatients(x => x.filter(q => q.id !== p.id)); showToast("Patient removed"); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#fef2f2", border: "none", cursor: "pointer" }}><Icon name="trash" size={14} color="#ef4444" /></button>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{p.gender} · {p.dob ? fmtDate(p.dob) : "DOB unknown"}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{p.phone}</div>
            {p.allergies && <div style={{ marginTop: 8, padding: "4px 10px", borderRadius: 6, background: "#fef2f2", color: "#ef4444", fontSize: 12 }}>⚠ Allergies: {p.allergies}</div>}
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
              <h3 style={{ margin: 0 }}>{modal === "add" ? "Add Patient" : "Edit Patient"}</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="x" size={20} color="#64748b" /></button>
            </div>
            <div style={{ padding: "18px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div style={{ gridColumn: "1/-1" }}><F label="Full Name *" name="name" /></div>
                <F label="Date of Birth" name="dob" type="date" />
                <F label="Gender" name="gender" options={["Male", "Female", "Other"]} />
                <F label="Phone" name="phone" />
                <F label="Address" name="address" />
                <div style={{ gridColumn: "1/-1" }}><F label="Known Allergies" name="allergies" /></div>
                <div style={{ gridColumn: "1/-1" }}><F label="Medical History" name="medHistory" type="textarea" /></div>
                <div style={{ gridColumn: "1/-1" }}><F label="Notes" name="notes" type="textarea" /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Cancel</button>
                <button onClick={save} style={{ flex: 2, padding: 11, borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{modal === "add" ? "Add Patient" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ══════════════════════════════════════════════════════════════════════════════
function Suppliers({ suppliers, setSuppliers, showToast }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const blank = { name: "", contact: "", email: "", address: "", notes: "" };

  function save() {
    if (!form.name) return showToast("Supplier name required", "error");
    if (modal === "add") { setSuppliers(p => [...p, { ...form, id: uid() }]); showToast("Supplier added"); }
    else { setSuppliers(p => p.map(x => x.id === modal ? { ...form, id: modal } : x)); showToast("Updated"); }
    setModal(null);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Suppliers</h1>
        <button onClick={() => { setForm({ ...blank }); setModal("add"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          <Icon name="plus" size={16} color="#fff" /> Add Supplier
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {suppliers.map(s => (
          <div key={s.id} style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="supplier" size={22} color="#00c896" />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setForm({ ...s }); setModal(s.id); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#eff6ff", border: "none", cursor: "pointer" }}><Icon name="edit" size={14} color="#0070f3" /></button>
                <button onClick={() => { setSuppliers(x => x.filter(q => q.id !== s.id)); showToast("Supplier removed"); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#fef2f2", border: "none", cursor: "pointer" }}><Icon name="trash" size={14} color="#ef4444" /></button>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>📞 {s.contact || "—"}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>✉ {s.email || "—"}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>📍 {s.address || "—"}</div>
            {s.notes && <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{s.notes}</div>}
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: 440, overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{modal === "add" ? "Add Supplier" : "Edit Supplier"}</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="x" size={20} color="#64748b" /></button>
            </div>
            <div style={{ padding: "18px 22px" }}>
              {["name", "contact", "email", "address", "notes"].map(k => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4, textTransform: "capitalize" }}>{k}</label>
                  <input value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Cancel</button>
                <button onClick={save} style={{ flex: 2, padding: 11, borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════════════════════
function Reports({ sales, drugs }) {
  const [period, setPeriod] = useState("today");

  const now = new Date();
  const filtered = sales.filter(s => {
    const d = new Date(s.date);
    if (period === "today") return s.date === today();
    if (period === "week") return (now - d) / 86400000 <= 7;
    if (period === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });

  const revenue = filtered.reduce((s, x) => s + x.total, 0);
  const drugCost = filtered.reduce((s, x) => {
    return s + (x.items || []).reduce((ss, it) => {
      const d = drugs.find(q => q.id === it.drugId);
      return ss + it.qty * (d?.costPrice || 0);
    }, 0);
  }, 0);
  const profit = revenue - drugCost;

  // Top selling drugs
  const drugSales = {};
  filtered.forEach(s => (s.items || []).forEach(it => {
    const d = drugs.find(q => q.id === it.drugId);
    const name = d?.name || it.drugName || "Unknown";
    if (!drugSales[name]) drugSales[name] = { qty: 0, revenue: 0 };
    drugSales[name].qty += it.qty;
    drugSales[name].revenue += it.qty * it.price;
  }));
  const topDrugs = Object.entries(drugSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);

  // Daily breakdown (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const daySales = sales.filter(s => s.date === key);
    return { label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }), revenue: daySales.reduce((s, x) => s + x.total, 0), count: daySales.length };
  });
  const maxRev = Math.max(...last7.map(d => d.revenue), 1);

  const Stat = ({ label, value, color }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Reports & Analytics</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {[["today", "Today"], ["week", "7 Days"], ["month", "This Month"], ["year", "This Year"], ["all", "All Time"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              style={{ padding: "8px 14px", borderRadius: 8, border: period === v ? "2px solid #0070f3" : "1px solid #e2e8f0", background: period === v ? "#eff6ff" : "#fff", color: period === v ? "#0070f3" : "#64748b", fontWeight: period === v ? 700 : 400, fontSize: 13, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
        <Stat label="Total Revenue" value={fmtMoney(revenue)} color="#00c896" />
        <Stat label="Est. Cost of Goods" value={fmtMoney(drugCost)} color="#f59e0b" />
        <Stat label="Est. Gross Profit" value={fmtMoney(profit)} color="#0070f3" />
        <Stat label="Transactions" value={filtered.length} color="#8b5cf6" />
        <Stat label="Avg Sale Value" value={fmtMoney(filtered.length ? revenue / filtered.length : 0)} color="#ec4899" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Bar chart */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Revenue — Last 7 Days</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160 }}>
            {last7.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>{d.revenue > 0 ? fmtMoney(d.revenue).replace("GH₵ ", "") : ""}</div>
                <div style={{ width: "100%", background: "linear-gradient(180deg,#00c896,#0070f3)", borderRadius: "4px 4px 0 0", height: `${(d.revenue / maxRev) * 120}px`, minHeight: d.revenue > 0 ? 4 : 0, transition: "height 0.5s" }} />
                <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top drugs */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Top Selling Drugs</h3>
          {topDrugs.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 14 }}>No data for this period</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topDrugs.map(([name, data], i) => (
                <div key={name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>#{i + 1} {name}</span>
                    <span style={{ color: "#00c896", fontWeight: 700 }}>{fmtMoney(data.revenue)}</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4 }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg,#00c896,#0070f3)", borderRadius: 4, width: `${(data.revenue / topDrugs[0][1].revenue) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{data.qty} units sold</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Value */}
      <div style={{ marginTop: 20, background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Current Stock Value</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {[
            ["Stock at Cost", drugs.reduce((s, d) => s + d.qty * (d.costPrice || 0), 0), "#f59e0b"],
            ["Stock at Retail", drugs.reduce((s, d) => s + d.qty * (d.sellingPrice || 0), 0), "#0070f3"],
            ["Potential Profit", drugs.reduce((s, d) => s + d.qty * ((d.sellingPrice || 0) - (d.costPrice || 0)), 0), "#00c896"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ padding: "14px 16px", borderRadius: 10, background: c + "10", borderLeft: `3px solid ${c}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{fmtMoney(v)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function Settings({ settings, setSettings, showToast, pinSetup, setPinSetup }) {
  const [form, setForm] = useState({ ...settings });
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  function saveSettings() {
    setSettings(form);
    showToast("Settings saved");
  }

  function changePin() {
    if (newPin.length !== 4) return setPinMsg("PIN must be 4 digits");
    if (newPin !== confirmPin) return setPinMsg("PINs do not match");
    const h = hashKey(newPin);
    LS.set("pharma_pin", h);
    setPinSetup(h);
    setNewPin(""); setConfirmPin("");
    setPinMsg(""); showToast("PIN updated successfully");
  }

  const F = ({ label, name, type = "text" }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[name] || ""} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
    </div>
  );

  return (
    <div>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800 }}>Settings</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Pharmacy info */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Pharmacy Information</h3>
          <F label="Pharmacy Name" name="pharmacyName" />
          <F label="Address" name="address" />
          <F label="Phone Number" name="phone" />
          <F label="License Number" name="licenseNo" />
          <F label="Receipt Footer Message" name="footer" />
          <button onClick={saveSettings} style={{ width: "100%", padding: 11, borderRadius: 10, background: "#00c896", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Settings</button>
        </div>

        {/* Security */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Change PIN</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>New 4-digit PIN</label>
              <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 18, letterSpacing: 8, textAlign: "center", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Confirm PIN</label>
              <input type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 18, letterSpacing: 8, textAlign: "center", boxSizing: "border-box" }} />
            </div>
            {pinMsg && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 8px" }}>{pinMsg}</p>}
            <button onClick={changePin} style={{ width: "100%", padding: 11, borderRadius: 10, background: "#0070f3", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Update PIN</button>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>License</h3>
            <div style={{ padding: "12px 16px", background: "#f0fdf9", borderRadius: 10, border: "1px solid #bbf7e0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="check" size={18} color="#00c896" />
                <span style={{ color: "#065f46", fontWeight: 700 }}>PharmaCare Pro — Licensed</span>
              </div>
              <p style={{ color: "#6ee7c7", fontSize: 12, margin: "8px 0 0" }}>Powered by EagleEyE Tech Suite · v{APP_META.version}</p>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Data Management</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 12px" }}>All data is stored locally in your browser.</p>
            <button onClick={() => { if (window.confirm("Clear ALL data? This cannot be undone.")) { localStorage.clear(); window.location.reload(); } }}
              style={{ width: "100%", padding: 11, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>
              Reset All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
