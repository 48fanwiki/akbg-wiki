/* ==========================================================================
   AKBGwiki 前端交互增强脚本
   - 兼容 Material navigation.instant (SPA 模式)
   - 自动新窗口打开外链 & 标记外链样式
   - 统一包裹所有表格，清除不合理的固定内联宽，长表格启用内部滚动吸顶
   - Pagefind 全文中文检索弹窗控制
   ========================================================================== */

(function () {
  var pagefindInitialized = false;
  var fixedBundlePath = null;

  function resolveBundlePath() {
    if (fixedBundlePath) return fixedBundlePath;
    var modal = document.getElementById("akb-search-modal");
    if (!modal || !modal.dataset.pagefindBase) {
      fixedBundlePath = "/pagefind/";
      return fixedBundlePath;
    }
    try {
      fixedBundlePath = new URL(modal.dataset.pagefindBase, window.location.href).pathname;
    } catch (e) {
      fixedBundlePath = "/pagefind/";
    }
    return fixedBundlePath;
  }

  function enhanceLinks() {
    document.querySelectorAll(".md-content a[href]").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
        return;
      }
      if (link.host && link.host !== window.location.host) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        if (!link.classList.contains("akb-external-link") && !link.classList.contains("md-icon")) {
          link.classList.add("akb-external-link");
        }
      }
    });
  }

  function enhanceTables() {
    var content = document.querySelector(".md-content .md-typeset");
    if (!content) return;

    content.querySelectorAll("table:not([class])").forEach(function (table) {
      // 清除原维基导出 HTML 表格残留的 style="width:98%" 等内联宽度限制
      if (table.hasAttribute("style")) {
        table.removeAttribute("style");
      }

      // 确保所有表格均位于 .md-typeset__scrollwrap 容器内，防止窄屏或超宽列溢出裁切
      var scrollwrap = table.closest(".md-typeset__scrollwrap");
      if (!scrollwrap) {
        scrollwrap = document.createElement("div");
        scrollwrap.className = "md-typeset__scrollwrap";
        var inner = document.createElement("div");
        inner.className = "md-typeset__table";
        table.parentNode.insertBefore(scrollwrap, table);
        inner.appendChild(table);
        scrollwrap.appendChild(inner);
      }

      // 仅对超长表格（>= 15 行）启用独立滚动吸顶容器，彻底避免压住页面其他元素
      if (table.rows && table.rows.length >= 15) {
        scrollwrap.classList.add("akb-tall-table");
      } else {
        scrollwrap.classList.remove("akb-tall-table");
      }
    });
  }

  function initPagefindUI() {
    if (pagefindInitialized) return;
    var container = document.getElementById("akb-pagefind-container");
    if (!container) return;

    if (typeof window.PagefindUI !== "function") {
      container.innerHTML =
        '<p style="padding:1rem;font-size:0.75rem;opacity:0.8;">' +
        "当前处于未索引的预览状态（<code>pagefind-ui.js</code> 尚未加载）。" +
        "请使用 <code>mkdocs build</code> 或启动脚本构建后体验完整中文分词检索。" +
        "</p>";
      return;
    }

    new window.PagefindUI({
      element: "#akb-pagefind-container",
      bundlePath: resolveBundlePath(),
      showSubResults: true,
      showImages: false,
      excerptLength: 24,
      translations: {
        placeholder: "输入成员名、曲目、番组、年份或日期（如 20121221）...",
        clear_search: "清空",
        load_more: "加载更多结果",
        search_label: "搜索全站维基",
        filters_label: "筛选",
        zero_results: "未找到包含「[SEARCH_TERM]」的词条，试试缩短关键词",
        many_results: "共找到 [COUNT] 个相关结果（关键词：[SEARCH_TERM]）",
        one_result: "共找到 1 个相关结果（关键词：[SEARCH_TERM]）",
        searching: "正在检索「[SEARCH_TERM]」...",
      },
    });
    pagefindInitialized = true;
  }

  function openSearchModal() {
    var modal = document.getElementById("akb-search-modal");
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    initPagefindUI();
    window.setTimeout(function () {
      var input = modal.querySelector(".pagefind-ui__search-input");
      if (input) input.focus();
    }, 30);
  }

  function closeSearchModal() {
    var modal = document.getElementById("akb-search-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function bindSearchEventsOnce() {
    if (window.__akbSearchEventsBound) return;
    window.__akbSearchEventsBound = true;

    resolveBundlePath();

    document.addEventListener("click", function (e) {
      if (e.target.closest("#akb-search-trigger")) {
        e.preventDefault();
        openSearchModal();
        return;
      }
      if (e.target.closest("[data-close-search]")) {
        e.preventDefault();
        closeSearchModal();
        return;
      }
      if (e.target.closest("#akb-pagefind-container a.pagefind-ui__result-link")) {
        closeSearchModal();
      }
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        var modal = document.getElementById("akb-search-modal");
        if (modal && modal.hidden) {
          openSearchModal();
        } else {
          closeSearchModal();
        }
        return;
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
        var isEditable =
          tag === "input" ||
          tag === "textarea" ||
          (document.activeElement && document.activeElement.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          openSearchModal();
        }
        return;
      }

      if (e.key === "Escape") {
        closeSearchModal();
      }
    });
  }

  function initSakuraOnce() {
    if (window.__akbSakuraInitialized) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    window.__akbSakuraInitialized = true;

    var canvas = document.getElementById("akb-sakura-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "akb-sakura-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
    }

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var palettes = [
      ["#ffc7da", "#f576a3"],
      ["#ffd6e5", "#f06898"],
      ["#ffbdd4", "#ea7ca4"],
      ["#ffe0ec", "#f794b8"],
    ];

    var width = 0;
    var height = 0;
    var petals = [];
    var rafId = null;
    var lastTs = 0;

    function targetPetalCount(w) {
      return Math.min(34, Math.max(16, Math.floor(w / 55)));
    }

    function createPetal(spawnFromTop) {
      var size = 7 + Math.random() * 8;
      var scale = size / 11;
      return {
        x: Math.random() * (width + 80) - 40,
        y: spawnFromTop ? -20 - Math.random() * 80 : Math.random() * height,
        size: size,
        speedY: (0.65 + Math.random() * 0.65) * scale,
        speedX: (0.15 + Math.random() * 0.45) * (Math.random() < 0.25 ? -0.6 : 1),
        swayAmp: 0.28 + Math.random() * 0.55,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.012 + Math.random() * 0.016,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.024,
        flip: Math.random() * Math.PI * 2,
        flipSpeed: 0.016 + Math.random() * 0.024,
        alpha: 0.42 + Math.random() * 0.34,
        palette: palettes[Math.floor(Math.random() * palettes.length)],
      };
    }

    function resizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var desired = targetPetalCount(width);
      while (petals.length < desired) {
        petals.push(createPetal(false));
      }
      if (petals.length > desired) {
        petals.length = desired;
      }
    }

    function drawPetal(p) {
      var s = p.size;
      var flipScale = 0.35 + 0.65 * Math.abs(Math.cos(p.flip));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, flipScale);
      ctx.globalAlpha = p.alpha;

      var grad = ctx.createLinearGradient(0, -s, 0, s);
      grad.addColorStop(0, p.palette[0]);
      grad.addColorStop(1, p.palette[1]);

      ctx.beginPath();
      ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(s * 0.68, s * 0.45, s * 0.82, -s * 0.45, s * 0.24, -s * 0.9);
      ctx.lineTo(0, -s * 0.66);
      ctx.lineTo(-s * 0.24, -s * 0.9);
      ctx.bezierCurveTo(-s * 0.82, -s * 0.45, -s * 0.68, s * 0.45, 0, s * 0.85);
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    function tick(ts) {
      if (document.hidden) {
        rafId = null;
        return;
      }
      if (!lastTs) lastTs = ts;
      var dt = Math.min(50, Math.max(0, ts - lastTs)) / 16.6667;
      lastTs = ts;

      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < petals.length; i++) {
        var p = petals[i];
        p.swayPhase += p.swaySpeed * dt;
        p.y += p.speedY * dt;
        p.x += (p.speedX + Math.sin(p.swayPhase) * p.swayAmp) * dt;
        p.rot += p.rotSpeed * dt;
        p.flip += p.flipSpeed * dt;

        if (p.y > height + 24 || p.x < -50 || p.x > width + 50) {
          petals[i] = createPetal(true);
        }
        drawPetal(petals[i]);
      }

      rafId = window.requestAnimationFrame(tick);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && !rafId) {
        lastTs = 0;
        rafId = window.requestAnimationFrame(tick);
      }
    });

    rafId = window.requestAnimationFrame(tick);
  }

  function onPageReady() {
    closeSearchModal();
    bindSearchEventsOnce();
    initSakuraOnce();
    enhanceLinks();
    enhanceTables();
  }

  if (typeof document$ !== "undefined" && typeof document$.subscribe === "function") {
    document$.subscribe(onPageReady);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onPageReady);
  } else {
    onPageReady();
  }
})();
