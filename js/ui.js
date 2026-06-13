// Build the DOM element for one card. Wires button callbacks supplied by app.js.
export function createCardElement(card, handlers) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = card.id;

  const img = document.createElement('img');
  img.src = card.thumbnailURL;
  img.alt = card.file.name;
  el.appendChild(img);

  const status = document.createElement('div');
  status.className = 'status';
  el.appendChild(status);

  const ctx = document.createElement('textarea');
  ctx.rows = 2;
  ctx.placeholder = '本圖專屬說明（選填）：例如 112 年數據';
  ctx.value = card.perCardContext;
  ctx.addEventListener('input', () => handlers.onContextChange(card.id, ctx.value));
  el.appendChild(ctx);

  const pre = document.createElement('pre');
  pre.className = 'output';
  el.appendChild(pre);

  const row = document.createElement('div');
  row.className = 'row';
  const copyBtn = button('複製', () => handlers.onCopy(card.id));
  const dlBtn = button('下載', () => handlers.onDownload(card.id));
  const regenBtn = button('重生', () => handlers.onRegen(card.id));
  row.append(copyBtn, dlBtn, regenBtn);
  el.appendChild(row);

  setCardStatus(el, card.status, card.errorMessage);
  return el;
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

const STATUS_TEXT = {
  queued: '待處理', processing: '產生中…', done: '完成', error: '錯誤',
};

export function setCardStatus(cardEl, status, errorMessage) {
  const s = cardEl.querySelector('.status');
  if (!s) return;
  s.className = 'status ' + status;
  s.textContent = status === 'error'
    ? `錯誤：${errorMessage || '未知錯誤'}`
    : STATUS_TEXT[status] || status;
}

// Render the output text for the current format into the card's <pre>.
export function renderCardOutput(cardEl, text) {
  cardEl.querySelector('.output').textContent = text;
}
