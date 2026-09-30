const DEFAULT_ORIGIN = "http://localhost:3000";

async function currentOrigin() {
  const { appOrigin } = await chrome.storage.sync.get("appOrigin");
  return String(appOrigin || DEFAULT_ORIGIN).replace(/\/$/, "");
}

async function refresh() {
  const origin = await currentOrigin();
  document.getElementById("origin").value = origin;
  const res = await chrome.runtime.sendMessage({ type: "me" });
  const el = document.getElementById("status");
  if (res.status === 401) {
    el.textContent = "앱에 로그인한 뒤 쿠팡 상품을 여세요.";
    return;
  }
  if (!res.ok) {
    el.textContent = "앱에 연결하지 못했습니다. 주소를 확인하세요.";
    return;
  }
  const names = (res.data.profiles || []).map((p) => p.name).join(", ");
  el.textContent = names
    ? `로그인됨 · ${names}`
    : "로그인됨 · 가족 프로필을 만들어 주세요.";
}

document.getElementById("save").onclick = async () => {
  const appOrigin = document.getElementById("origin").value.trim().replace(/\/$/, "");
  await chrome.storage.sync.set({ appOrigin });
  await refresh();
};

document.getElementById("open").onclick = async () => {
  const origin = await currentOrigin();
  chrome.tabs.create({ url: `${origin}/extensions` });
};

refresh();
