// ==UserScript==
// @name         Reddit Uncollapse
// @description  Expand auto-collapsed comments on old Reddit.
// @version      1.0.0
// @author       Xyl
// @namespace    xyl
// @icon         https://www.redditstatic.com/desktop2x/img/favicon/favicon-96x96.png
// @match        https://*.reddit.com/r/*/comments/*
// ==/UserScript==

function uncollapse() {
	document.querySelectorAll(".comment:not(.collapse-processed):not(.morechildren):not(.morerecursion)").forEach((e) => {
		e.classList.add("collapse-processed");
		if (e.classList.contains("collapsed")) {
			e.querySelector(".tagline .expand").click();
		}
	});
}

const commentsObserver = new MutationObserver(() => uncollapse());
commentsObserver.observe(document.body, { childList: true, subtree: true });
