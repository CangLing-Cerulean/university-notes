import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(process.argv[2]??'微积分甲/微积分甲1');
const titles=['函数','数列极限','函数极限','连续性与间断点','导数与微分','微分中值定理','洛必达法则','泰勒公式','导数的应用','不定积分','定积分','定积分的应用','反常积分'];
const groups=[{dir:'知识讲义',name:'01-知识讲义与例题',title:'微积分甲1 · 知识讲义与例题',intro:'按课程十三章整理核心概念、定理条件、公式推导与基础、经典例题。符号和方法与配套真题解析统一。'}, {dir:'期末真题',name:'02-期末真题与解析',title:'微积分甲1 · 期末真题与解析',intro:'按课程十三章归类，章内按年份由近到远编排。题目出处沿用用户提供汇编的年份题号，未逐份核验原始试卷。已发现的问题在题目旁注明。'}];
for(const group of groups){
  const toc=titles.map((title,i)=>`${i+1}. [第${i+1}章 ${title}](#chapter-${i+1})`).join('\n');
  const chapters=await Promise.all(titles.map(async(title,i)=>{
    const filename=`${String(i+1).padStart(2,'0')}-${title}.md`;
    return `<a id="chapter-${i+1}"></a>\n\n`+(await fs.readFile(path.join(root,group.dir,filename),'utf8')).replace(/^(#{1,5}) /gm,'#$1 ').replaceAll('](../assets/','](assets/');
  }));
  const sources=group.dir==='知识讲义' ? '《微积分（甲）I 讲义》；《微积分（甲）I 期末考试高频考点与备考策略》（页眉署名 Ephemeral）。讲义按课程范围重新编写，例题解析重新推导。' : '《微积分（甲）I 期末真题演练本（配套讲义使用）》；《微积分（甲）I 期末考试真题全解析》（页眉署名 Ephemeral）。题面根据提供资料整理，解析经审核、补充与重写。';
  await fs.writeFile(path.join(root,`${group.name}.md`),`# ${group.title}\n\n${group.intro}\n\n**资料依据：** ${sources}原始资料仅保留在本地。\n\n## 目录\n\n${toc}\n\n${chapters.join('\n\n')}`,'utf8');
}
let readme='# 微积分甲1\n\n[返回微积分甲](../README.md) · [返回知识库](../../README.md)\n\n';
readme+='## 完整文档\n\n| 部分 | Markdown | PDF |\n| --- | --- | --- |\n';
for(const group of groups) readme+=`| ${group.dir==='知识讲义'?'知识讲义与基础、经典例题':'期末真题与解析'} | [阅读](${group.name}.md) | [下载](${group.name}.pdf) |\n`;
readme+='\n## 章节目录\n\n| 章 | 主题 | 讲义 Markdown | 讲义 PDF | 真题 Markdown | 真题 PDF |\n| --- | --- | --- | --- | --- | --- |\n';
titles.forEach((title,i)=>{
  const file=`${String(i+1).padStart(2,'0')}-${title}`;
  readme+=`| ${i+1} | ${title} | [阅读](知识讲义/${file}.md) | [下载](知识讲义/${file}.pdf) | [阅读](期末真题/${file}.md) | [下载](期末真题/${file}.pdf) |\n`;
});
readme+='\n## 来源与审核\n\n资料中的章节顺序用于两部分统一编排；按题型重复出现的真题合并，涉及多个知识点时按主要方法归章。章节无独立真题时明确记录空缺，不补编真题。\n\n[内容审核记录](审核记录.md)记录题干冲突、缺失条件、补解与解析修正。所有原始 PDF 保留在本地 `参考资料/`，不上传 GitHub。\n\n## PDF 重建\n\n在仓库根目录执行，需 Node.js 20 及以上与 Microsoft Edge：\n\n```powershell\nnpm install --prefix tools/pdf\nnode tools/pdf/assemble.mjs\nnode tools/pdf/render.mjs "微积分甲/微积分甲1/01-知识讲义与例题.md" "微积分甲/微积分甲1/02-期末真题与解析.md"\n```\n\n每章 Markdown 是编辑源；运行合并脚本更新完整文档，完整 PDF 与分章 PDF 均从相应 Markdown 渲染。\n';
await fs.writeFile(path.join(root,'README.md'),readme,'utf8');
console.log(root);
