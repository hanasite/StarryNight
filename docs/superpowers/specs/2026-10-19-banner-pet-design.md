# 横幅宠物 Clawd 设计

日期：2026-10-19
状态：已确认（用户批准）

## 目标

在 StarryNight 的横幅模式（wallpaperMode = banner）下，于横幅图片与正文卡片的分界线上放一只
可自动走动、可水平拖动、可点击互动、可原地收成书签隐藏的 Clawd 宠物。

## 非目标

- 不改动全屏壁纸、无壁纸、overlay 模式下的页面布局。
- 不引入 Live2D、语音、音效或第三方动画运行时。
- 不在云端仓库提交个人博文内容；本功能只涉及主题代码与公开宠物素材。

## 素材

- 来源：<https://petdex.dev/pets/clawd-4>（作者 fecet），Codex 经典 v1 图集。
- 文件：`spritesheet.webp`，1536×1872，8 列 × 9 行，单格 192×208，带透明通道。
- 动画行（行号 / 帧数）：
  - 0 待机 6
  - 1 向右跑 8
  - 2 向左跑 8
  - 3 挥手 4
  - 4 跳跃 5
  - 5 ERROR 8
  - 6 睡觉 6
  - 7 敲电脑 6
  - 8 检查 6
- 存放：`Mizuki/public/assets/pets/clawd/`（`spritesheet.webp`、`pet.json`、来源说明）。
- 渲染：CSS `background-position` 逐帧切换，`image-rendering: pixelated`；不修改原图集。

## 位置与结构

- `BannerPet.astro` 插入 `MainGridLayout.astro` 中居中的相对定位容器内、`#main-grid` 之前。
- 根层位于 `bottom: 100%`，即主内容容器顶边；该边就是横幅图片与正文卡片的分界线
  （桌面主内容 `top: 35vh`，移动端沿用现有 CSS 覆盖值）。
- 根层内绝对定位：
  - 宠物精灵（192×208，`transform: scale(var(--clawd-scale))`，`transform-origin: bottom left`）。
  - 每行动画使用独立的地面偏移，把脚底对齐分界线（待机 42px、跑动 50px、挥手 26px、
    跳跃/ERROR/敲电脑/检查 9px、睡觉 53px，单位是未缩放的图集像素）。
  - 气泡：宠物上方，`pointer-events: none`，自动消失。
  - 隐藏按钮：宠物右上角，悬停/聚焦显示；触屏常驻半透明。
  - 书签：隐藏时在宠物**当前位置**收成一个小书签（带 Clawd 眼睛），不放到内容侧边；点击书签恢复。
- 显示条件：`body.enable-banner:not(.fullscreen-banner)`。
- 宽度 `< 1280px` 且 `#banner-wrapper` 带 `mobile-hide-banner`（手机内页横幅隐藏）时，
  宠物与书签一起隐藏。

## 交互与状态机

状态：`idle` / `walk` / `react` / `drag` / `hidden`。

- **自动走动**：待机 3–7 秒后随机选择行为：
  - 走到新位置（左右跑行动画，速度约 45px/s，移动端 32px/s）；
  - 敲电脑 4–6 秒（第 7 行）；
  - 睡觉 5–8 秒（第 6 行）。
- **拖动**：Pointer 事件 + `setPointerCapture`；只改变 x，夹紧在正文宽度内；拖动超过 4px
  视为拖动而不是点击；触屏 `touch-action: pan-y`，不阻断纵向滚动。
- **点击**：随机播放挥手/跳跃/敲电脑/检查之一，同时显示气泡台词（例如「呀哈喽」
  「写博客中…」「别戳啦～」「让我看看…」），2.2 秒后消失；反应期间有 400ms 冷却。
- **隐藏**：点隐藏按钮 → 宠物在原地缩小淡出 → 同一位置出现小书签 → 点书签原地恢复。
  隐藏状态写 `localStorage`，刷新/翻页保持；位置以宽度比例写 `localStorage`，窗口缩放自动夹紧。
- **无障碍**：宠物 `role="button"`、`tabindex="0"`，Enter/空格触发互动；气泡 `aria-live="polite"`；
  隐藏按钮与书签有 `aria-label`；`prefers-reduced-motion` 下停止自动走动和滑动过渡，只保留点击反应。
- **性能**：单个 `requestAnimationFrame` 循环；`document.hidden`、用户隐藏、非横幅模式时暂停；
  图集仅 63KB，无第三方依赖。

## 导航与生命周期

- 组件位于 swup 的 `#content-wrapper` 之外，页面切换不会被替换；位置与隐藏状态自然保留。
- 监听 `swup:contentReplaced`、`resize` 与 `ResizeObserver`，重新计算可用宽度并夹紧 x。
- 模式切换由 `body` 类（`enable-banner` / `fullscreen-banner`）驱动，CSS 自动显示/隐藏。

## 涉及文件

- 新增：`Mizuki/public/assets/pets/clawd/spritesheet.webp`
- 新增：`Mizuki/public/assets/pets/clawd/pet.json`
- 新增：`Mizuki/public/assets/pets/clawd/README.md`
- 新增：`Mizuki/src/components/misc/BannerPet.astro`
- 新增：`Mizuki/src/scripts/banner-pet.js`
- 修改：`Mizuki/src/layouts/MainGridLayout.astro`

## 验收

- `pnpm exec astro build` 成功。
- 桌面：宠物站在横幅/正文分界线上；自动走动；拖动后松手回到待机；点击出现动画与气泡；
  隐藏后原地出现小书签，点击恢复；刷新后隐藏状态保持。
- 模式：切到全屏/无横幅模式宠物消失，切回横幅模式恢复。
- 导航：swup 翻页后宠物位置与状态保持，不重复创建。
- 移动端（≤767px）：缩放后仍贴线、可点击、可拖动、不阻断滚动；手机内页横幅隐藏时宠物隐藏。
- `prefers-reduced-motion`：无自动走动，无大幅滑动。
- 不遮挡/拦截正文与横幅链接的点击。

## 素材来源

- Petdex 页面：<https://petdex.dev/pets/clawd-4>
- 图集直链：<https://assets.petdex.dev/pets/clawd-68cf9f39524c/zip.zip>

## 修订记录

- 2026-10-19：隐藏方式从「右侧半头把手」改为「在宠物当前位置收成书签」，避免手机端侧边布局问题。
- 2026-10-19：新增 deepseek酱（petdex `deepseek`），与 Clawd 共用同一条横幅分界线；每只宠物独立位置、独立隐藏书签；书签支持水平拖拽；DeepSeek 图层 z-index 高于 Clawd。不同宠物使用独立缩放、地面偏移和气泡台词（`banner-pet-profiles.js`）。
