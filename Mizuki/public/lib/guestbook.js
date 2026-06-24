/**
 * 留言板 — 访客免登录 + 用现有编辑/删除按钮
 * localStorage 记录本浏览器发过的 memo ID，匹配到的启用右上角按钮
 */
(function (global) {
  "use strict";

  var API = "/api/guestbook";
  var STORAGE = "gb_my_memos";

  function getMyMemos() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch (e) { return []; }
  }
  function addMyMemo(name) {
    var list = getMyMemos();
    list.push(name);
    try { localStorage.setItem(STORAGE, JSON.stringify(list)); } catch (e) {}
  }
  function isMyMemo(name) {
    return getMyMemos().indexOf(name) >= 0;
  }

  function init() {
    var nick = document.getElementById("gb-nick");
    var content = document.getElementById("gb-content");
    var submit = document.getElementById("gb-submit");
    var msgEl = document.getElementById("gb-msg");
    if (!nick || !content || !submit) return;

    try { var s = localStorage.getItem("gb_nick"); if (s) nick.value = s; } catch (e) {}
    nick.addEventListener("change", function () {
      try { localStorage.setItem("gb_nick", nick.value); } catch (e) {}
    });

    var busy = false;
    submit.addEventListener("click", function () {
      if (busy) return;
      var text = content.value.trim();
      if (!text) { msgEl.textContent = "写点什么吧～"; return; }
      if (text.length < 2) { msgEl.textContent = "至少 2 个字哦"; return; }

      busy = true; submit.disabled = true; submit.textContent = "发送中...";

      var body = text;
      if (nick.value.trim()) body = "**" + nick.value.trim() + "**：" + body;
      body += " #guestbook";

      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: body, visibility: "PUBLIC" }) })
        .then(function (r) { if (r.status === 429) { msgEl.textContent = "太快啦，请等一分钟再来～"; return null; } if (!r.ok) { msgEl.textContent = "发送失败"; return null; } return r.json(); })
        .then(function (d) {
          if (d) { addMyMemo(d.name); content.value = ""; msgEl.textContent = "留言成功！"; refresh(); }
        })
        .catch(function () { msgEl.textContent = "网络错误"; })
        .finally(function () { busy = false; submit.disabled = false; submit.textContent = "留下脚印 🐾"; });
    });

    // 轮询等待 memos-client 渲染完成，再接管自己的按钮
    var attempts = 0;
    (function tryActivate() {
      if (activateOwnButtons() || ++attempts > 20) return;
      setTimeout(tryActivate, 500);
    })();
  }

  function refresh() {
    var list = document.getElementById("memo-list");
    if (list && window.memosClient) { list.innerHTML = ""; window.memosClient.init({ container: "memo-list", mode: "moment" }); }
    var a = 0;
    (function retry() { if (activateOwnButtons() || ++a > 20) return; setTimeout(retry, 500); })();
  }

  /** 找到自己的卡片，显示右上角原有按钮并接管点击。返回 true 表示至少激活了一个 */
  function activateOwnButtons() {
    var found = false;
    var cards = document.querySelectorAll("#memo-list [data-memo-id]");
    cards.forEach(function (card) {
      var memoId = card.getAttribute("data-memo-id");
      if (!memoId || !isMyMemo(memoId)) return;
      if (card.dataset.gbActivated) { found = true; return; }
      card.dataset.gbActivated = "1";

      var editBtn = card.querySelector(".memo-edit-btn");
      var delBtn = card.querySelector(".memo-delete-btn");

      if (editBtn) {
        editBtn.style.display = "";
        editBtn.style.pointerEvents = "auto";
        editBtn.onclick = function (e) { e.preventDefault(); e.stopPropagation(); editMemo(memoId); return false; };
        found = true;
      }
      if (delBtn) {
        delBtn.style.display = "";
        delBtn.style.pointerEvents = "auto";
        delBtn.onclick = function (e) { e.preventDefault(); e.stopPropagation(); deleteMemo(memoId); return false; };
        found = true;
      }
    });
    return found;
  }

  // Memos API 路径接受 /api/v1/memos/{id}（不含 memos/ 前缀）
  function apiPath(memoId) {
    return API + "/" + memoId.replace(/^memos\//, "");
  }

  function editMemo(memoId) {
    var card = document.querySelector('[data-memo-id="' + memoId + '"]');
    var old = card ? (card.getAttribute("data-memo-content") || "") : "";
    var clean = old.replace(/\s*#guestbook\s*$/g, "").trim();
    var input = prompt("编辑留言（标签自动保留）：", clean);
    if (!input || !input.trim()) return;
    var content = input.replace(/\s*#guestbook\s*/gi, "").trim() + " #guestbook";

    fetch(apiPath(memoId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content }),
    }).then(function (r) { if (r.ok) refresh(); else alert("编辑失败"); });
  }

  function deleteMemo(memoId) {
    if (!confirm("确定删除？")) return;
    fetch(apiPath(memoId), { method: "DELETE" })
      .then(function (r) { if (r.ok) refresh(); else alert("删除失败"); });
  }

  global.guestbookForm = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
