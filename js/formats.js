// Convert canonical Markdown to plain text.
// Order matters: headings and bullets are line-anchored and run before
// inline emphasis so a leading "* " bullet is not mistaken for italic.
export function mdToPlain(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/^\s*[-*]\s+/gm, '• ')     // bullets
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/`([^`]+)`/g, '$1')        // inline code
    .trim();
}

// Escape LaTeX special characters that appear in AMR text (e.g. "97%",
// "co-trimoxazole" underscores). Runs before emphasis markers are turned
// into commands, so the backslashes/braces we add are not re-escaped.
function escapeLatex(s) {
  return s.replace(/([%&#_$])/g, '\\$1');
}

function inlineLatex(s) {
  return escapeLatex(s)
    .replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
    .replace(/\*(.+?)\*/g, '\\textit{$1}');
}

export function mdToLatex(md) {
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) { out.push('\\begin{itemize}'); inList = true; }
      out.push('  \\item ' + inlineLatex(bullet[1]));
      continue;
    }
    if (inList) { out.push('\\end{itemize}'); inList = false; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cmd = level === 1 ? 'section' : level === 2 ? 'subsection' : 'subsubsection';
      out.push(`\\${cmd}{${inlineLatex(h[2])}}`);
      continue;
    }
    out.push(inlineLatex(line));
  }
  if (inList) out.push('\\end{itemize}');
  return out.join('\n').trim();
}
