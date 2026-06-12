import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdToPlain, mdToLatex } from '../js/formats.js';

test('mdToPlain strips heading markers', () => {
  assert.equal(mdToPlain('# 標題\n內文'), '標題\n內文');
});

test('mdToPlain strips bold and italic', () => {
  assert.equal(mdToPlain('對 **vancomycin** 與 *E. coli*'), '對 vancomycin 與 E. coli');
});

test('mdToPlain converts bullets to dot', () => {
  assert.equal(mdToPlain('- 第一\n- 第二'), '• 第一\n• 第二');
});

test('mdToPlain strips inline code', () => {
  assert.equal(mdToPlain('值為 `97%`'), '值為 97%');
});

test('mdToLatex converts headings by level', () => {
  assert.equal(mdToLatex('# A'), '\\section{A}');
  assert.equal(mdToLatex('## B'), '\\subsection{B}');
});

test('mdToLatex converts bold and italic', () => {
  assert.equal(
    mdToLatex('對 **vancomycin** 與 *E. coli*'),
    '對 \\textbf{vancomycin} 與 \\textit{E. coli}'
  );
});

test('mdToLatex wraps bullets in itemize', () => {
  assert.equal(
    mdToLatex('- 第一\n- 第二'),
    '\\begin{itemize}\n  \\item 第一\n  \\item 第二\n\\end{itemize}'
  );
});

test('mdToLatex escapes percent, underscore, and braces', () => {
  assert.equal(mdToLatex('敏感性 97% 與 co_trimoxazole'), '敏感性 97\\% 與 co\\_trimoxazole');
  assert.equal(mdToLatex('範圍 {a}'), '範圍 \\{a\\}');
});
