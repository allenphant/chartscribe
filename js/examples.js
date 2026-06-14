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
    output: '本圖為 Aerobic Gram Negative–Non Enterobacterales 敏感性圖譜。A. baumannii 對 aminoglycoside 類（GM 42%、AN 46%）、fluoroquinolone 類（CIP 37%、LVX 39%）與 carbapenem 類（IPM／MEM 39%）敏感性均偏低，僅 tigecycline 達 77%；P. aeruginosa 對 carbapenem 類達 87% 以上、amikacin 97%。',
  },
  amr_resistance_bar: {
    image: 'assets/examples/amr_resistance_bar.png',
    output: '本圖為某菌種之抗藥性百分比橫條圖（全部檢體，CO+HO）。對 ampicillin 抗藥性最高（約 75%），fluoroquinolone 類（ciprofloxacin、levofloxacin）與 co-trimoxazole 約 45%，第三代 cephalosporin 類約 30%；carbapenem 類最低，均低於 5%。',
  },
  amr_composition: {
    image: 'assets/examples/amr_composition.png',
    output: '本圖為 108–113 年醫療相關感染（HO）各菌種占當年度菌株數之比率（100% 堆疊）。前三名 K. pneumoniae、E. coli、P. aeruginosa 占比相近（各約 16–17%），6 年間大致持平；其後依序為 Enterococcus faecium、S. aureus、A. baumannii 等。',
  },
  amr_trend: {
    image: 'assets/examples/amr_trend.png',
    output: '本圖為 108–113 年 VR Enterococcus faecalis 抗藥性百分比趨勢，含醫學中心／區域／地區／全國四條線。整體多在 5% 以下，以地區醫院最高（109 年約 5.5% 後回落至 3–4%），醫學中心最低（約 0.5% 以下）。',
  },
};
