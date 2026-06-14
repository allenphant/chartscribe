// 每個風格預設的「範例」：一張輸入圖片 + 它大致會產出的文字。
// 卡片會顯示這兩者，讓使用者選之前就知道內容。
//
// 要替換素材：
//   1. 圖片：把檔案放到  assets/examples/  並對應下面的 image 檔名。
//   2. 文字：直接改下面的 output 字串（純文字即可）。
//
// image 路徑為相對於網站根目錄。檔案不存在時，卡片會顯示「範例圖」佔位。
export const EXAMPLES = {
  general: {
    image: 'assets/examples/general.png',
    output: '（範例）此為長條圖，X 軸為年度、Y 軸為數值；整體呈逐年上升趨勢，以最末一年最高。',
  },
  amr_susceptibility: {
    image: 'assets/examples/amr_susceptibility.png',
    output: '113 年 E. coli 於 penicillin 類中以 piperacillin/tazobactam 之敏感性（87%）為最高；carbapenem 類與 tigecycline 之敏感性均維持於 97% 以上；fluoroquinolone 類之 ciprofloxacin 與 levofloxacin 約 54%。',
  },
  amr_resistance_bar: {
    image: 'assets/examples/amr_resistance_bar.png',
    output: '113 年 K. pneumoniae 對 carbapenem 類之抗藥性約介於 11–15%，對第三代 cephalosporin 類約 28–36%；血液檢體檢出菌株之抗藥率普遍高於尿液檢體。',
  },
  amr_composition: {
    image: 'assets/examples/amr_composition.png',
    output: '108–113 年血液檢體前三名依序為 E. coli、K. pneumoniae、S. aureus；其中 E. coli 占比約 42–44%，6 年間大致持平。',
  },
  amr_trend: {
    image: 'assets/examples/amr_trend.png',
    output: '108→113 年全國 CRKP 抗藥性比例由 12.9% 上升至 15.6%，且各年度均以地區醫院最高、醫學中心最低。',
  },
};
