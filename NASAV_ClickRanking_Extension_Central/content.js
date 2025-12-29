(() => {
  const dateKey = new Date().toISOString().slice(0, 10);
  const COUNTS_KEY = `nasav_click_counts_${dateKey}`;
  const OP_KEY = `nasav_operator_${dateKey}`;

  
  // === NASAV Click Ranking (central) ===
  const API_BASE = "https://script.google.com/macros/s/AKfycbw_qCLxz78V6t-jHDoqmH2O_MXfEZi5VewIIU6fuT8D3ozg21qV4Hcz0xC3ajnum8b28g/exec";
  function pushClicksToServer(operatorId, clicks) {
    try {
      const url =
        API_BASE +
        "?action=push" +
        "&operator=" + encodeURIComponent(String(operatorId)) +
        "&dateKey=" + encodeURIComponent(new Date().toISOString().slice(0, 10)) +
        "&clicks=" + encodeURIComponent(String(clicks || 0)) +
        "&machine=" + encodeURIComponent("ext") +
        "&ts=" + encodeURIComponent(String(Date.now()));
      fetch(url, { mode: "no-cors" }); // fire-and-forget (no CORS preflight)
    } catch (e) {}
  }
function isCentrax() {
    return location.href.includes("192.168.1.180:8081/mytceweb/");
  }
  function isLoginPage() {
    return location.href.includes("/login");
  }
  function isDashboard() {
    const isLocalhost = location.hostname === "localhost" && location.port === "8080";
    const isFile = location.protocol === "file:";
    const matchesName = location.pathname.includes("HOMEPAGENASAV");
    return (isLocalhost || isFile) && matchesName;
  }

  function getStorage(keys) {
    return new Promise(resolve => chrome.storage.local.get(keys, resolve));
  }
  function setStorage(obj) {
    return new Promise(resolve => chrome.storage.local.set(obj, resolve));
  }

  async function setupCentraxCounting() {
    let st = await getStorage([OP_KEY, COUNTS_KEY]);
    let operator = st[OP_KEY];

    if (isLoginPage()) {
      const input = prompt("BENVENUTO OPERATORE\n\nInserisci il tuo numero operatore (SOLO NUMERO):");
      if (!input) return;
      operator = `Operatore ${String(input).trim()}`;
      await setStorage({ [OP_KEY]: operator });
    }

    if (!operator) return;

    let counts = st[COUNTS_KEY] || {};
    if (typeof counts !== "object" || counts === null) counts = {};
    if (!counts[operator]) counts[operator] = 0;
    await setStorage({ [COUNTS_KEY]: counts });

    let buffer = 0;
    
    let lastPushTs = 0;
document.addEventListener("mousedown", (e) => {
      if (e.button === 0) buffer += 1;
    }, true);

    setInterval(async () => {
      if (buffer === 0) return;
      const st2 = await getStorage([COUNTS_KEY, OP_KEY]);
      const op = st2[OP_KEY] || operator;
      let c = st2[COUNTS_KEY] || {};
      if (!c[op]) c[op] = 0;
      c[op] += buffer;
      buffer = 0;
      await setStorage({ [COUNTS_KEY]: c });
    
      // Push to central ranking every 5 seconds
      const now = Date.now();
      if (now - lastPushTs >= 5000) {
        lastPushTs = now;
        pushClicksToServer(op, c[op] || 0);
      }
}, 1000);

    window.addEventListener("keydown", async (e) => {
      if (e.altKey && (e.key === "o" || e.key === "O")) {
        const nuovo = prompt("Cambia numero operatore (SOLO NUMERO):");
        if (nuovo) {
          operator = `Operatore ${String(nuovo).trim()}`;
          await setStorage({ [OP_KEY]: operator });
          const s3 = await getStorage([COUNTS_KEY]);
          let c3 = s3[COUNTS_KEY] || {};
          if (!c3[operator]) c3[operator] = 0;
          await setStorage({ [COUNTS_KEY]: c3 });
          alert(`Operatore attivo: ${operator}`);
        }
      }
    });
  }

  async function setupDashboardRender() {
    function pickTargetBox() {
      return document.querySelector("#clickRanking")
          || document.querySelector("#classifica-operatori")
          || document.querySelector(".right .card:last-of-type .ko-list")
          || document.body;
    }
    const box = pickTargetBox();

    async function render() {
      const st = await getStorage([COUNTS_KEY]);
      const counts = st[COUNTS_KEY] || {};
      const entries = Object.entries(counts).map(([nome, click]) => ({ nome, click }));
      entries.sort((a,b) => b.click - a.click);

      if (entries.length === 0) {
        box.innerHTML = "<div style='color:#ff9f1a;padding:6px 10px;'>Nessun dato disponibile</div>";
        return;
      }
      const rows = entries.map(op => `
        <div style='display:flex;justify-content:space-between;padding:4px 10px;border-bottom:1px solid #ff9f1a;'>
          <span style='color:#00ffff;'>${op.nome}</span>
          <span style='color:#ff9f1a;font-weight:bold;'>${op.click}</span>
        </div>`).join('');
      box.innerHTML = rows;
    }

    render();
    setInterval(render, 2000);
  }

  if (isCentrax()) {
    setupCentraxCounting();
  } else if (isDashboard()) {
    setupDashboardRender();
  }
})();