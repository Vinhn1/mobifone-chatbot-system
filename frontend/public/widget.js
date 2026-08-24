/**
 * MobiFone AI Chatbot - Embeddable Web Widget
 * Lightweight standalone loader script
 */
(function () {
  "use strict";

  // Tránh load lặp lại nhiều lần
  if (window.__MobiFoneWidgetLoaded) return;
  window.__MobiFoneWidgetLoaded = true;

  // Tìm script tag hiện tại để đọc cấu hình data-*
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  var scriptSrc = currentScript ? currentScript.src : "";
  var defaultBaseUrl = "";
  if (scriptSrc) {
    var urlObj = new URL(scriptSrc);
    defaultBaseUrl = urlObj.origin;
  } else {
    defaultBaseUrl = window.location.origin;
  }

  // Cấu hình widget
  var config = {
    baseUrl: (currentScript && currentScript.getAttribute("data-chat-url")) || defaultBaseUrl,
    position: (currentScript && currentScript.getAttribute("data-position")) || "bottom-right",
    themeColor: (currentScript && currentScript.getAttribute("data-theme-color")) || "#005BAA",
    botName: (currentScript && currentScript.getAttribute("data-bot-name")) || "Mia - MobiFone AI",
    greeting: (currentScript && currentScript.getAttribute("data-greeting")) || "",
    autoOpen: (currentScript && currentScript.getAttribute("data-auto-open")) === "true",
  };

  // Custom style injection
  var style = document.createElement("style");
  style.id = "mobifone-widget-styles";
  style.innerHTML = `
    .mbf-widget-container {
      position: fixed;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    .mbf-widget-bottom-right {
      bottom: 20px;
      right: 20px;
    }
    .mbf-widget-bottom-left {
      bottom: 20px;
      left: 20px;
    }
    .mbf-widget-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${config.themeColor};
      box-shadow: 0 4px 16px rgba(0, 91, 170, 0.35), 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      position: relative;
      user-select: none;
      border: none;
      outline: none;
      padding: 0;
    }
    .mbf-widget-launcher:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 22px rgba(0, 91, 170, 0.45), 0 2px 6px rgba(0, 0, 0, 0.15);
    }
    .mbf-widget-launcher:active {
      transform: scale(0.95);
    }
    .mbf-widget-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background-color: #ef4444;
      color: white;
      border: 2px solid white;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: bold;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: mbf-pulse 2s infinite;
    }
    @keyframes mbf-pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .mbf-widget-iframe-container {
      position: fixed;
      bottom: 92px;
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 110px);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transform-origin: bottom right;
      transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s ease;
      z-index: 2147483646;
    }
    .mbf-widget-bottom-right .mbf-widget-iframe-container {
      right: 20px;
      transform-origin: bottom right;
    }
    .mbf-widget-bottom-left .mbf-widget-iframe-container {
      left: 20px;
      transform-origin: bottom left;
    }
    .mbf-widget-iframe-container.mbf-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    .mbf-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    /* Mobile responsive */
    @media (max-width: 640px) {
      .mbf-widget-iframe-container {
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
        border: none !important;
        z-index: 2147483647 !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Tạo DOM Elements
  var container = document.createElement("div");
  container.className = "mbf-widget-container mbf-widget-" + config.position;

  // Iframe chat container
  var iframeContainer = document.createElement("div");
  iframeContainer.className = "mbf-widget-iframe-container";

  // Xây dựng URL params cho /embed
  var embedParams = new URLSearchParams();
  embedParams.set("theme", config.themeColor);
  embedParams.set("title", config.botName);
  if (config.greeting) {
    embedParams.set("greeting", config.greeting);
  }

  var iframeUrl = config.baseUrl.replace(/\/$/, "") + "/embed?" + embedParams.toString();

  var iframe = document.createElement("iframe");
  iframe.className = "mbf-widget-iframe";
  iframe.src = iframeUrl;
  iframe.title = config.botName;
  iframe.allow = "microphone; camera";
  iframeContainer.appendChild(iframe);

  // Nút launcher tròn
  var launcher = document.createElement("button");
  launcher.className = "mbf-widget-launcher";
  launcher.setAttribute("aria-label", "Mở Chatbot MobiFone");

  // SVG Icons (Chat & Close)
  var chatIconSvg = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;

  var closeIconSvg = `
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  launcher.innerHTML = chatIconSvg;

  // Badge tin nhắn
  var badge = document.createElement("div");
  badge.className = "mbf-widget-badge";
  badge.innerText = "1";
  launcher.appendChild(badge);

  container.appendChild(iframeContainer);
  container.appendChild(launcher);
  document.body.appendChild(container);

  var isOpen = false;

  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.classList.add("mbf-open");
      launcher.innerHTML = closeIconSvg;
      if (badge.parentNode) {
        badge.style.display = "none";
      }
    } else {
      iframeContainer.classList.remove("mbf-open");
      launcher.innerHTML = chatIconSvg;
    }
  }

  function openWidget() {
    if (!isOpen) toggleWidget();
  }

  function closeWidget() {
    if (isOpen) toggleWidget();
  }

  launcher.addEventListener("click", toggleWidget);

  // Lắng nghe sự kiện postMessage từ trang iframe chat
  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "MOBIFONE_WIDGET_CLOSE") {
      closeWidget();
    } else if (event.data.type === "MOBIFONE_WIDGET_OPEN") {
      openWidget();
    } else if (event.data.type === "MOBIFONE_WIDGET_MESSAGE_RECEIVED") {
      if (!isOpen && badge) {
        badge.style.display = "flex";
      }
    }
  });

  if (config.autoOpen) {
    setTimeout(openWidget, 1000);
  }

  // Export Global API
  window.MobiFoneWidget = {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    isOpen: function () {
      return isOpen;
    },
  };
})();
