/**
 * 每日随机 Banner / 壁纸注入器
 * 从 NAS /banner/daily.json 获取每日随机图片，注入到：
 * 1. Banner 轮播系统（window.__bannerCarouselFrames）
 * 2. 全屏壁纸轮播系统（[data-fullscreen-wallpaper] [data-carousel-item]）
 * 如果 daily.json 不存在或获取失败，静默降级使用默认图片
 */
(function () {
  "use strict";

  async function injectDailyBanner() {
    try {
      var resp = await fetch("/banner/daily.json");
      if (!resp.ok) return;
      var data = await resp.json();

      // ============================================================
      // 1. 全屏壁纸模式（[data-fullscreen-wallpaper]）
      // ============================================================
      var wallpaperContainer = document.querySelector("[data-fullscreen-wallpaper]");
      if (wallpaperContainer) {
        injectFullscreenWallpaper(wallpaperContainer, data);
      }

      // ============================================================
      // 2. Banner 轮播模式（window.__bannerCarouselFrames）
      // ============================================================
      var retries = 0;
      while (!window.__bannerCarouselFrames && retries < 50) {
        await new Promise(function (r) {
          setTimeout(r, 100);
        });
        retries++;
      }
      if (!window.__bannerCarouselFrames) return;

      ["desktop", "mobile"].forEach(function (type) {
        var slotClass = "banner-image-slot-" + type;
        var images = data[type] || data.desktop;
        if (!images || !images.length) return;

        var frames = images.map(function (src) {
          return (
            '<img alt="Daily banner" class="object-cover h-full w-full" src="' +
            src +
            '" loading="eager" fetchpriority="high">'
          );
        });

        window.__bannerCarouselFrames[slotClass] = frames;

        if (window.__bannerCarouselIndex) {
          window.__bannerCarouselIndex[type] = 0;
        }

        var slot = document.querySelector("." + slotClass);
        if (slot) {
          slot.innerHTML = frames[0];
          slot.classList.remove("banner-kb");
          void slot.offsetWidth;
          slot.classList.add("banner-kb");
        }
      });
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 将每日图片注入全屏壁纸轮播
   * 只替换 [data-carousel-item] 的 src，不动轮播定时器
   * （因为 initFullscreenWallpaperCarousel 被 define:vars IIFE 包裹，不是全局函数）
   */
  function injectFullscreenWallpaper(container, data) {
    var allItems = container.querySelectorAll("[data-carousel-item]");
    if (allItems.length === 0) return;

    // 区分桌面端和移动端（按父级 class）
    var desktopImgs = [];
    var mobileImgs = [];
    for (var i = 0; i < allItems.length; i++) {
      var parent = allItems[i].parentElement;
      if (parent.classList.contains("md:block") || parent.classList.contains("lg:block")) {
        desktopImgs.push(allItems[i]);
      } else {
        mobileImgs.push(allItems[i]);
      }
    }
    // fallback
    if (desktopImgs.length === 0) desktopImgs = Array.from(allItems);

    var desktopSrcs = data.desktop || data.mobile || [];
    var mobileSrcs = data.mobile || data.desktop || [];

    desktopImgs.forEach(function (img, i) {
      img.src = desktopSrcs[i % desktopSrcs.length];
      img.style.opacity = i === 0 ? "1" : "0";
    });
    mobileImgs.forEach(function (img, i) {
      img.src = mobileSrcs[i % mobileSrcs.length];
      img.style.opacity = i === 0 ? "1" : "0";
    });

    // 重置轮播索引
    try { sessionStorage.setItem("mizuki_wallpaper_index", "0"); } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectDailyBanner);
  } else {
    injectDailyBanner();
  }
})();
