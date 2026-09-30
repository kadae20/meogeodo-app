(function () {
  const DOT = {
    green: "#16a34a",
    yellow: "#ca8a04",
    red: "#dc2626",
    gray: "#94a3b8",
  };
  const KEYS = [
    "원재료명 및 함량",
    "원재료명및함량",
    "원재료명",
    "영양정보",
    "영양성분",
    "당류",
    "포화지방",
    "알레르기",
    "함유",
    "원산지",
  ];

  function keywordWindows(text) {
    const parts = [];
    for (const k of KEYS) {
      const span = k === "원산지" ? 90 : /나트륨|당류/.test(k) ? 500 : 2500;
      let from = 0;
      for (let n = 0; n < 2; n++) {
        const i = text.indexOf(k, from);
        if (i < 0) break;
        parts.push(text.slice(i, i + span));
        from = i + k.length;
      }
    }
    return parts.join("\n").slice(0, 40000);
  }

  function iframeTexts() {
    let t = "";
    for (const f of document.querySelectorAll("iframe")) {
      try {
        const doc = f.contentDocument || f.contentWindow.document;
        const inner = doc && doc.body && doc.body.innerText;
        if (inner) t += "\n" + inner;
      } catch (_e) {
        /* cross-origin — all_frames 스크립트가 따로 보냄 */
      }
    }
    return t;
  }

  function embeddedData() {
    const parts = [];
    document.querySelectorAll("script#__NEXT_DATA__, script[type='application/ld+json']").forEach((s) => {
      const t = s.textContent || "";
      if (t.length > 20) parts.push(t.slice(0, 40000));
    });
    return parts.join("\n");
  }

  function hasVisibleLabel() {
    return /원재료명|영양정보|영양성분/.test(
      ((document.body && document.body.innerText) || "") + iframeTexts()
    );
  }

  function openProductDetail() {
    const nodes = document.querySelectorAll(
      '[role="tab"], a, button, li, div[class*="tab"], span[class*="tab"]'
    );
    for (const el of nodes) {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (t === "상품상세" || /^상품상세\s*$/.test(t)) {
        el.click();
        return true;
      }
    }
    for (const el of nodes) {
      const t = (el.textContent || "").replace(/\s+/g, "").trim();
      if (t.length < 16 && /필수표기|상품정보제공/.test(t)) {
        el.click();
        return true;
      }
    }
    return false;
  }

  function pageText() {
    const body =
      ((document.body && document.body.innerText) || "") + iframeTexts();
    const extra = keywordWindows(body.replace(/\s+\n/g, "\n"));
    return (extra || body).slice(0, 40000);
  }

  function capture() {
    const visible = pageText();
    const json = embeddedData();
    return (visible + "\n" + extraFrameText + "\n" + json).slice(0, 60000);
  }

  function hasNutrientNumbers(text) {
    return (
      /당류[\s\S]{0,24}[0-9]/.test(text) && /나트륨[\s\S]{0,24}[0-9]/.test(text)
    );
  }

  function detailImageUrls() {
    const seen = new Set();
    const out = [];
    function add(img) {
      const src =
        img.currentSrc ||
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-img-src") ||
        "";
      if (!src || src.startsWith("data:") || seen.has(src)) return;
      if (/icon|logo|sprite|badge|avatar|rating|blank|1x1/i.test(src)) return;
      const w = img.naturalWidth || Number(img.getAttribute("width") || 0);
      const h = img.naturalHeight || Number(img.getAttribute("height") || 0);
      if ((w && w < 200) || (h && h < 200)) return;
      seen.add(src);
      out.push(src);
    }
    const roots = document.querySelectorAll(
      "[id*='productDetail'], [class*='product-detail'], [class*='ProductDetail'], [class*='essential']"
    );
    roots.forEach((r) => r.querySelectorAll("img").forEach(add));
    document.querySelectorAll("iframe").forEach((f) => {
      try {
        const doc = f.contentDocument;
        if (doc) doc.querySelectorAll("img").forEach(add);
      } catch (_e) {
        /* skip */
      }
    });
    if (out.length === 0) {
      document.querySelectorAll("img").forEach((img) => {
        const src = img.currentSrc || img.src || "";
        if (/coupangcdn\.com/i.test(src)) add(img);
      });
    }
    return out.slice(0, 3);
  }

  function isProductPage() {
    return /\/v[pm]\/products\//.test(location.pathname);
  }

  if (window !== window.top) {
    const send = () => {
      const text = pageText().slice(0, 8000);
      if (text.length < 20) return;
      chrome.runtime.sendMessage({ type: "frame-text", text }).catch(() => {});
    };
    send();
    setTimeout(send, 1500);
    setTimeout(send, 4000);
    return;
  }

  let lastUrl = "";
  let host = null;
  let card = null;
  let peeking = false;
  let extraFrameText = "";
  let ocrFor = "";

  function ensureUi() {
    if (host) return;
    host = document.createElement("div");
    host.id = "meogeodo-host";
    const shadow = host.attachShadow({ mode: "open" });
    card = document.createElement("div");
    card.innerHTML = `
      <style>
        .box {
          width: 200px;
          background: #fff;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
          padding: 12px 12px 10px;
          font-size: 13px;
          line-height: 1.35;
        }
        .brand {
          font-weight: 700;
          font-size: 13px;
          color: #047857;
          margin-bottom: 8px;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 0;
        }
        .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .right { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
        .st { font-size: 10px; color: #64748b; }
        .dot {
          width: 12px; height: 12px; border-radius: 99px; flex: 0 0 auto;
          box-shadow: inset 0 0 0 1px rgba(15,23,42,.15);
        }
        .msg { color: #64748b; font-size: 12px; }
        .btn {
          margin-top: 8px;
          width: 100%;
          border: 0;
          background: #047857;
          color: #fff;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
      <div class="box">
        <div class="brand">먹어도될까</div>
        <div class="body"><div class="msg">확인 중…</div></div>
      </div>
    `;
    shadow.appendChild(card);
    document.documentElement.appendChild(host);
  }

  function setBody(html) {
    ensureUi();
    card.querySelector(".body").innerHTML = html;
  }

  function openApp(origin, path) {
    window.open(`${origin}${path}`, "_blank", "noopener");
  }

  function statusShort(status) {
    if (status === "내 기준 통과") return "통과";
    if (status === "확인 필요") return "확인";
    if (status === "내 기준과 충돌") return "충돌";
    return "부족";
  }

  function sendPeek(payload, ms) {
    return Promise.race([
      chrome.runtime.sendMessage({ type: "peek", payload }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ms)
      ),
    ]);
  }

  async function peek(opts) {
    if (!isProductPage()) return;
    if (peeking) return;
    peeking = true;
    ensureUi();
    const url = location.href;
    lastUrl = url;
    if (!opts || !opts.quiet) setBody('<div class="msg">확인 중…</div>');
    try {
      if (!hasVisibleLabel()) openProductDetail();
      const text = capture();
      const payload = { url, title: document.title, text };
      const urls = detailImageUrls();
      const packLike =
        hasNutrientNumbers(text) && /향료|정제수|원재료명/.test(text);
      if (urls.length && !packLike) {
        payload.image_urls = urls;
        if (!opts || !opts.quiet) {
          setBody('<div class="msg">성분표 사진을 읽는 중입니다…</div>');
        }
      }
      const res = await sendPeek(payload, payload.image_urls ? 25000 : 12000);
      if (location.href !== lastUrl) return;
      render(res);
    } catch (_e) {
      setBody(
        `<div class="msg">앱에 연결하지 못했습니다. localhost:3000이 켜져 있는지 확인하세요.</div>
         <button class="btn" data-go="retry">다시 시도</button>`
      );
      const btn = card.querySelector("[data-go=retry]");
      if (btn) btn.onclick = () => peek();
    } finally {
      peeking = false;
    }
  }

  function render(res) {
    if (!res) {
      setBody('<div class="msg">지금은 확인할 수 없습니다.</div>');
      return;
    }
    const origin = res.origin;
    if (res.status === 401) {
      setBody(
        `<div class="msg">앱에서 로그인해 주세요. 주소가 팝업의 앱 주소와 같아야 합니다.</div>
         <button class="btn" data-go="login">로그인</button>`
      );
      card.querySelector("[data-go=login]").onclick = () =>
        openApp(origin, "/login?next=/extensions");
      return;
    }
    if (res.status === 409) {
      setBody(
        `<div class="msg">가족 프로필이 필요합니다.</div>
         <button class="btn" data-go="on">프로필 만들기</button>`
      );
      card.querySelector("[data-go=on]").onclick = () =>
        openApp(origin, "/app/onboarding");
      return;
    }
    if (!res.ok) {
      setBody('<div class="msg">지금은 확인할 수 없습니다. npm run dev 가 켜져 있는지 보세요.</div>');
      return;
    }
    const rows = (res.data.profiles || [])
      .map((p) => {
        if (p.applicable === false) {
          return `<div class="row"><span class="name">${escapeHtml(p.name)}</span>
           <span class="st">${escapeHtml(p.skip_reason || "제외")}</span></div>`;
        }
        return `<div class="row"><span class="name">${escapeHtml(p.name)}</span>
           <span class="right"><span class="st">${escapeHtml(statusShort(p.status))}</span>
           <span class="dot" style="background:${DOT[p.dot] || DOT.gray}"></span></span></div>`;
      })
      .join("");
    let hint = "";
    const skipped = (res.data.profiles || []).filter((p) => p.applicable === false);
    const notes = (res.data.profiles || []).filter(
      (p) =>
        p.applicable !== false &&
        p.note &&
        (p.status === "확인 필요" || p.status === "내 기준과 충돌")
    );
    if (res.data.ocr_error) {
      hint = `<div class="msg" style="margin-top:6px">${escapeHtml(
        res.data.ocr_error
      )}</div>`;
    } else if (notes.length) {
      hint = `<div class="msg" style="margin-top:6px">${escapeHtml(
        notes.map((p) => `${p.name}: ${p.note}`).join(" ")
      )}</div>`;
    } else if (skipped.length) {
      hint = `<div class="msg" style="margin-top:6px">${escapeHtml(
        skipped.map((p) => p.name).join("·")
      )}은(는) 이 상품 대상이 아니라 점수에서 뺐습니다. 급여·섭취 가능이 아닙니다.</div>`;
    } else if (!res.data.has_ingredients) {
      hint = res.data.has_nutrition
        ? '<div class="msg" style="margin-top:6px">영양은 읽었습니다. 원재료가 상품상세에 보이면 잠시 뒤 다시 읽습니다.</div>'
        : '<div class="msg" style="margin-top:6px">상품상세에서 원재료·영양이 보이게 연 뒤 2~3초 기다리세요. 접혀 있으면 읽지 못합니다.</div>';
    }
    setBody(
      `${rows}${hint}<button class="btn" data-go="detail">자세히</button>`
    );
    card.querySelector("[data-go=detail]").onclick = () =>
      openApp(
        origin,
        `/app/check?go=1&url=${encodeURIComponent(location.href)}`
      );

    if (
      (!res.data.has_ingredients || !res.data.has_nutrition) &&
      ocrFor !== lastUrl &&
      location.href === lastUrl
    ) {
      const urls = detailImageUrls();
      if (urls.length) {
        ocrFor = lastUrl;
        setBody(
          `${rows}<div class="msg" style="margin-top:6px">상세가 이미지라 사진을 읽는 중입니다…</div><button class="btn" data-go="detail">자세히</button>`
        );
        card.querySelector("[data-go=detail]").onclick = () =>
          openApp(
            origin,
            `/app/check?go=1&url=${encodeURIComponent(location.href)}`
          );
        sendPeek(
          {
            url: lastUrl,
            title: document.title,
            text: capture(),
            image_urls: urls,
          },
          25000
        )
          .then((ocrRes) => {
            if (location.href !== lastUrl) return;
            render(ocrRes);
          })
          .catch(() => {});
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "frame-text" || !msg.text) return;
    extraFrameText = (extraFrameText + "\n" + msg.text).slice(-40000);
    if (/원재료명|영양정보|향료|당류|나트륨/.test(msg.text)) {
      clearTimeout(window.__meogeodoFramePeek);
      window.__meogeodoFramePeek = setTimeout(() => peek({ quiet: true }), 600);
    }
  });

  document.addEventListener(
    "click",
    (e) => {
      const t = e.target && e.target.closest ? e.target.closest("a,button,li,div") : null;
      const label = (t && t.innerText) || "";
      if (/상품상세|필수표기|영양정보/.test(label)) {
        setTimeout(() => peek({ quiet: true }), 600);
        setTimeout(() => peek({ quiet: true }), 2000);
      }
    },
    true
  );

  peek();
  setTimeout(() => peek({ quiet: true }), 1500);
  setTimeout(() => peek({ quiet: true }), 4000);
  setTimeout(() => peek({ quiet: true }), 8000);

  const mo = new MutationObserver(() => {
    const raw = (document.body && document.body.innerText) || "";
    if (/원재료명|영양정보/.test(raw)) {
      clearTimeout(window.__meogeodoMoPeek);
      window.__meogeodoMoPeek = setTimeout(() => peek({ quiet: true }), 500);
    }
  });
  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true });
  }

  let href = location.href;
  setInterval(() => {
    if (location.href !== href) {
      href = location.href;
      extraFrameText = "";
      ocrFor = "";
      peek();
    }
  }, 800);
})();
