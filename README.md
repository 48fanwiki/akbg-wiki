# AKBGwiki

AKB48 Group 历史演唱会、剧场公演、音乐番组与娱乐节目资料归档维基。

## 技术架构

- **文档引擎**：[MkDocs](https://www.mkdocs.org/) + [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- **中文检索**：[Pagefind](https://pagefind.app/)（构建期生成分片索引，支持中文/日文/日期高效检索）
- **自动化部署**：GitHub Actions 构建并发布至 Cloudflare Pages（支持 PR 自动检查与预览部署）

## 本地预览与构建

### 1. 环境准备

需要 **Python 3.10+** 与 **Node.js 18+**（用于自动运行 `npx pagefind` 生成中文索引）：

```bash
pip install -r requirements.txt
```

### 2. 构建静态网站（含 Pagefind 搜索索引）

```bash
mkdocs build --clean
```

构建完成后，将生成的 `site/` 目录通过本地静态服务器打开即可体验完整搜索功能：

```bash
python -m http.server 8000 -d site
```

浏览器访问 `http://127.0.0.1:8000`。

> 也可运行 `mkdocs serve` 进行快速编辑预览（若本地已缓存 pagefind，钩子脚本同样会自动建立索引）。

## 部署到 Cloudflare Pages（进阶构建）

1. 在 Cloudflare 控制台获取你的 `Account ID` 与具有 `Cloudflare Pages: Edit` 权限的 `API Token`。
2. 在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中添加两个 Secret：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. 修改 `.github/workflows/deploy.yml` 中的 `--project-name=akbg-wiki` 为你的 Cloudflare Pages 项目名称。
4. 推送代码到 `main` 分支后，GitHub Actions 将自动完成编译、Pagefind 中文索引与上线部署。

## 贡献与版权

欢迎同好通过 Pull Request 修正错别字、补充遗漏场次或更新有效链接。提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

本站仅提供纯文本资料与互联网公开链接索引，不存储任何音视频媒体文件。
