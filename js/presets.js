const LANGUAGE_RULES = `輸出語言：預設繁體中文；若使用者指示要求其他語言，則依其指示。
生物醫學專有名詞一律保留英文不翻譯：菌種學名（如 Escherichia coli）、抗生素名（如 vancomycin）、抗藥性縮寫（如 CRAB、MRSA）。
菌種學名以 Markdown 斜體呈現，例如 *Escherichia coli*。
僅輸出描述文字本身，使用 Markdown 格式，不要加入前言或解釋你正在做什麼。`;

const OBJECTIVE_RULES = `客觀守則：
- 只描述圖表中實際呈現的數據，不加入任何臨床詮釋或建議（例如不可寫「可作為可靠的治療選擇」）。
- 敏感率（% susceptible）與抗藥率（% resistant）為互補概念，不可混用，依圖表標示為準。
- 若某數據之檢測菌株數少於 20，不予描述。`;

// Per-preset chart-description fragment. The full default prompt for each
// preset is fragment + language rules + (for AMR presets) objective rules,
// composed by composeDefault() below so the user can see and edit it all.
const FRAGMENTS = {
  general: {
    name: '通用',
    objective: false,
    fragment: '請客觀描述這張圖表所呈現的數據與趨勢。',
  },
  amr_susceptibility: {
    name: 'AMR－敏感性圖譜',
    objective: true,
    fragment: '這是一張抗生素敏感性圖譜（矩陣表格，格內為敏感率 % susceptible 與檢測菌株數）。請以每種菌種各自獨立成一段的方式描述，逐段說明該菌種對各抗生素類別的敏感率數值。請以連續段落散文書寫，不要使用任何條列（bullet list）或項目符號。',
  },
  amr_resistance_bar: {
    name: 'AMR－抗藥性百分比橫條圖',
    objective: true,
    fragment: '這是一張抗藥性百分比橫條圖（含 95% 信賴區間，可能分社區感染 CO 與醫療相關感染 HO）。請描述各抗生素之抗藥率（% resistant）數值，並指出 CO 與 HO 或不同檢體別之差異。',
  },
  amr_composition: {
    name: 'AMR－菌株組成堆疊長條圖',
    objective: true,
    fragment: '這是一張菌株組成的 100% 堆疊長條圖（逐年呈現各菌種占比）。請描述占比最高的前幾名菌種，以及其在各年度間的升降方向。',
  },
  amr_trend: {
    name: 'AMR－多重抗藥趨勢折線圖',
    objective: true,
    fragment: '這是一張多重抗藥菌抗藥性百分比的趨勢折線圖（通常含醫學中心／區域醫院／地區醫院／全國四條線，跨多個年度）。請描述各年度間的走勢方向，以及不同醫院層級間的高低差異。',
  },
};

function composeDefault({ fragment, objective }) {
  const parts = [fragment, LANGUAGE_RULES];
  if (objective) parts.push(OBJECTIVE_RULES);
  return parts.join('\n\n');
}

// PRESETS exposes each preset's display name and its full default prompt
// (the complete text that would be sent before shared/per-card context).
export const PRESETS = Object.fromEntries(
  Object.entries(FRAGMENTS).map(([key, def]) => [
    key,
    { name: def.name, defaultPrompt: composeDefault(def) },
  ])
);

export function defaultPrompt(presetKey) {
  return (PRESETS[presetKey] || PRESETS.general).defaultPrompt;
}

// Compose the final system prompt from an (editable) base prompt plus the
// runtime shared instructions and per-card context.
export function buildSystemPrompt(basePrompt, sharedInstructions, perCardContext) {
  const parts = [basePrompt];
  if (sharedInstructions && sharedInstructions.trim()) {
    parts.push('使用者共用指示：' + sharedInstructions.trim());
  }
  if (perCardContext && perCardContext.trim()) {
    parts.push('本圖補充資料：' + perCardContext.trim());
  }
  return parts.join('\n\n');
}
