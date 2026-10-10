import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import katex from 'katex';
import { chromium } from 'playwright';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const inputs = process.argv.slice(2);
if (!inputs.length) throw new Error('Usage: node tools/pdf/render.mjs <document.md> [...]');
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const math = (source, displayMode) => katex.renderToString(source, {
  displayMode, throwOnError: true, strict: 'error', output: 'html', trust: false,
});
marked.use({ extensions: [
  {
    name: 'blockMath', level: 'block', start: src => src.indexOf('$$'),
    tokenizer(src) {
      const match = /^\$\$\s*\n([\s\S]+?)\n\$\$(?:\s*\n|$)/.exec(src);
      if (match) return { type: 'blockMath', raw: match[0], text: match[1] };
    },
    renderer: token => `<div class="equation">${math(token.text, true)}</div>`,
  },
  {
    name: 'inlineMath', level: 'inline', start: src => src.indexOf('$'),
    tokenizer(src) {
      const match = /^\$([^$\n]+?)\$/.exec(src);
      if (match) return { type: 'inlineMath', raw: match[0], text: match[1] };
    },
    renderer: token => math(token.text, false),
  },
] });
const css = await fs.readFile(path.join(toolDir, 'print.css'), 'utf8');
const katexDir = path.join(toolDir, 'node_modules/katex/dist');
const katexCss = (await fs.readFile(path.join(katexDir, 'katex.min.css'), 'utf8')).replace(
  /url\(([^)]+)\)/g, (full, relative) => {
    const clean = relative.replace(/['"]/g, '');
    return `url("${new URL(`file:///${path.join(katexDir, clean).replaceAll('\\', '/')}`).href}")`;
  },
);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const input of inputs) {
    const inputPath = path.resolve(input);
    const source = await fs.readFile(inputPath, 'utf8');
    const title = source.split('\n').find(line => line.startsWith('# '))?.slice(2) ?? path.basename(inputPath, '.md');
    let body = marked.parse(source);
    body = body.replace(/<h2>(第\d+章[^<]*)<\/h2>/g, (_, text) => `<h2 class="chapter">${text}</h2>`);
    body = body.replace(/<h[234]>资料依据<\/h[234]>\s*(<p>[\s\S]*?<\/p>)/g, (_, paragraph) => `<aside class="source-note"><strong>资料依据</strong>${paragraph}</aside>`);
    body = body.replace(/(<h[12][^>]*>第\d+章[^<]*<\/h[12]>)([\s\S]*?)(<aside class="source-note">[\s\S]*?<\/aside>)/g, (_, heading, content, reference) => `${heading}${reference}${content}`);
    body = body.replace(/<h[234]>审核说明<\/h[234]>\s*<p>([\s\S]*?)<\/p>/g, (_, text) => `<p class="audit-note"><strong>审核说明：</strong>${text}</p>`);
    const page = await browser.newPage();
    await page.goto(`file:///${inputPath.replaceAll('\\', '/')}`);
    await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${katexCss}\n${css}</style></head><body><main>${body}</main></body></html>`, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const errors = await page.evaluate(() => {
      const failures = [];
      for (const element of document.querySelectorAll('.equation')) {
        let size = 14;
        while (element.scrollWidth > element.clientWidth + 1 && size > 9) {
          size -= 0.5;
          element.style.fontSize = `${size}px`;
        }
        if (element.scrollWidth > element.clientWidth + 1) failures.push(element.textContent);
      }
      return failures;
    });
    if (errors.length) throw new Error(`Formula overflow in ${input}: ${errors.join('; ')}`);
    const output = inputPath.replace(/\.md$/i, '.pdf');
    await page.pdf({
      path: output, format: 'A4', printBackground: true, displayHeaderFooter: true,
      margin: { top: '22mm', bottom: '20mm', left: '22mm', right: '22mm' },
      headerTemplate: `<div style="font-family:serif;font-size:8px;width:100%;margin:0 22mm;color:#555">${esc(title)}</div>`,
      footerTemplate: '<div style="font-family:serif;font-size:9px;width:100%;text-align:center;color:#555"><span class="pageNumber"></span></div>',
      outline: true,
    });
    await page.close();
    console.log(output);
  }
} finally { await browser.close(); }
