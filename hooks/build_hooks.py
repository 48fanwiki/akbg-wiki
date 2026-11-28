import hashlib
import logging
import os
import re
import shutil
import subprocess

log = logging.getLogger("mkdocs.hooks.build_hooks")

_ASSET_HASHES = {}


def _file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:8]


def on_config(config):
    """Compute content hashes for custom CSS/JS to bust stale browser/CDN cache."""
    docs_dir = config["docs_dir"]
    _ASSET_HASHES.clear()
    for rel in ("stylesheets/extra.css", "javascripts/custom.js"):
        full = os.path.join(docs_dir, *rel.split("/"))
        if os.path.isfile(full):
            _ASSET_HASHES[rel] = _file_hash(full)
    return config


_PRESERVE_TAG_RE = re.compile(
    r"(<(?:pre|code|script|style|textarea)\b[^>]*>.*?</(?:pre|code|script|style|textarea)>)",
    re.S | re.I,
)
_HTML_COMMENT_RE = re.compile(r"<!--(?!\[if).*?-->", re.S)


def _minify_html_whitespace(html: str) -> str:
    """Safely collapse Jinja/MkDocs indentation whitespace without altering pre/code/script blocks."""
    parts = _PRESERVE_TAG_RE.split(html)
    for i in range(0, len(parts), 2):
        chunk = _HTML_COMMENT_RE.sub("", parts[i])
        chunk = re.sub(r">\s*\n\s*<", "><", chunk)
        chunk = re.sub(r"\n[ \t]+", "\n", chunk)
        chunk = re.sub(r"\n{2,}", "\n", chunk)
        parts[i] = chunk
    return "".join(parts)


def on_post_page(output, page, config):
    """Append ?v=<hash> to custom CSS/JS references and minify HTML indentation whitespace."""
    for rel, digest in _ASSET_HASHES.items():
        output = re.sub(
            rf'((?:href|src)="[^"]*{re.escape(rel)})(")',
            rf"\1?v={digest}\2",
            output,
        )
    return _minify_html_whitespace(output)


def _find_pagefind_cmd():
    """Locate pagefind executable or npx fallback."""
    pagefind_bin = shutil.which("pagefind")
    if pagefind_bin:
        return [pagefind_bin]

    npx_bin = shutil.which("npx")
    if npx_bin:
        return [npx_bin, "--yes", "pagefind"]

    return None


def _copy_cloudflare_files(site_dir: str, docs_dir: str):
    """Copy Cloudflare Pages _redirects and _headers into site root if present."""
    project_root = os.path.dirname(os.path.abspath(docs_dir))
    cf_dir = os.path.join(project_root, "cloudflare")
    if not os.path.isdir(cf_dir):
        return

    for filename in ("_redirects", "_headers"):
        src = os.path.join(cf_dir, filename)
        if os.path.isfile(src):
            dst = os.path.join(site_dir, filename)
            shutil.copy2(src, dst)
            log.info("Copied %s to %s", src, dst)


def on_post_build(config):
    """Build Pagefind CJK search index and copy Cloudflare edge config files."""
    site_dir = config["site_dir"]
    docs_dir = config["docs_dir"]

    _copy_cloudflare_files(site_dir, docs_dir)

    if os.environ.get("SKIP_PAGEFIND_HOOK") == "1":
        log.info("SKIP_PAGEFIND_HOOK=1 detected; skipping Pagefind step in hook.")
        return

    cmd_prefix = _find_pagefind_cmd()
    if not cmd_prefix:
        log.warning(
            "Neither 'pagefind' nor 'npx' was found in PATH. "
            "Skipping Pagefind search index generation."
        )
        return

    cmd = [
        *cmd_prefix,
        "--site",
        site_dir,
        "--output-subdir",
        "pagefind",
    ]
    log.info("Running Pagefind indexing: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        log.error("Pagefind failed (exit %s):\n%s\n%s", result.returncode, result.stdout, result.stderr)
        raise RuntimeError(f"Pagefind indexing failed with exit code {result.returncode}")

    for line in result.stdout.splitlines():
        if line.strip():
            log.info("[pagefind] %s", line)
