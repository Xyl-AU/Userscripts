// ==UserScript==
// @name         Cozy.tv Sticker Menu
// @description  Display & save stickers from all channels on Cozy.tv
// @version      1.0.0
// @author       Xyl
// @namespace    xyl
// @icon         https://cozy.tv/public/cz_fav_128.png
// @match        https://cozy.tv/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

let version = "1.0.0";
let stickers = document.createElement("template");
let saved = document.createElement("template");
let lastPath = "";
let stickerUrlBase = "https://prd.foxtrotstream.xyz/a/stk";
let stickerList = GM_getValue("stickercache", []);
let tagList = GM_getValue("tagcache", {});
let currentUpdate;
let hasUpdated = false;

function setErrorText(text) {
	document.querySelector(".flex.p-2[style='height: 300px;']").children[2].innerText = text;
}

function applyStickerHTML() {
	generateSaved();
	if (menu = document.querySelector(".flex.p-2[style='height: 300px;']")) {
		let tabs = menu.querySelector(".flex.gap-2");
		tabs.innerHTML = `
<span class="bg-gray-500 font-medium select-none cursor-pointer rounded-tl-sm rounded-tr-sm px-2 py-1 text show-all-stickers">All</span>
<span class="font-medium select-none cursor-pointer rounded-tl-sm rounded-tr-sm px-2 py-1 text only-saved-stickers">Saved</span>`;
		try {
			menu.children[2].replaceWith(stickers.content.querySelector("div").cloneNode(true));
		} catch {
			setErrorText("Loading...");
		}
	}
}

function generateSaved() {
	let savedStickers = GM_getValue("savedstickers", []);
	saved.innerHTML = `<div class="h-full bg-gray-500 p-2 overflow-y-auto scrollbar-pretty stickers saved-stickers grid p-2 grid-cols-5 gap-2" style="grid-auto-rows: min-content;"></div>`;
	savedStickers.forEach(e => {
		let stickerUrl = `${stickerUrlBase}/${e}.webp`;
		saved.content.querySelector("div").insertAdjacentHTML("afterbegin", `<div sticker-url="${stickerUrl}" sticker-id="${e}" class="cursor-pointer liststicker saved" style="background-image: url('${stickerUrl}')" title=${e}><div class="saved-toggle"></div></div>`);
	});
	if (savedWindow = document.querySelector(".saved-stickers")) {
		savedWindow.replaceWith(saved.content.querySelector("div").cloneNode(true));
	}
}

function createStickers(array) {
	stickers.innerHTML = `<div class="h-full bg-gray-500 p-2 overflow-y-auto scrollbar-pretty"><input id="sticker-search" class="rounded outline-none w-full border-2 border-gray-600 px-2 py-1" style="font-size: 14px; margin-bottom: 5px;" placeholder="Search sticker tag, ID, or channel name"></div>`;
	let savedStickers = GM_getValue("savedstickers", []);
	[...array].forEach(e => {
		if (e == undefined || e[1] == undefined) {
			return;
		}
		let data = JSON.parse(e[1]);
		stickerUrlBase = data.stickerCDN;
		let userStickerHTML = `<div class="stickercategory">`;
		userStickerHTML += `<span class="username p-2">${e[0]}${e[2] ? " - update failed, will retry" : ""}</span><br><div class="stickers grid p-2 grid-cols-5 gap-2">`;
		data.stickers.forEach(stk => {
			let stickerId = stk["_id"];
			let tags = tagList[stickerId];
			let stickerUrl = `${stickerUrlBase}/${stickerId}.webp`;
			let newStickerHTML = `<div sticker-url="${stickerUrl}" sticker-id="${stickerId}" sticker-tags="${tags ? tags.join(" ") : ""}" user-id=${e[0]} class="cursor-pointer liststicker${savedStickers.includes(stickerId) ? " saved" : ""}" style="background-image: url('${stickerUrl}')" title=${stickerId}><div class="saved-toggle"></div></div>`;
			userStickerHTML += newStickerHTML;
		});
		userStickerHTML += "</div></div>";
		if (window.location.pathname.split("/")[1].toLowerCase() == e[0].toLowerCase()) {
			stickers.content.querySelector("#sticker-search").insertAdjacentHTML("afterend", userStickerHTML);
		} else {
			stickers.content.querySelector("div").insertAdjacentHTML("beforeend", userStickerHTML);
		}
	});
	if (!document.querySelector(".show-all-stickers")) {
		applyStickerHTML();
	}
}

function getUserStickers(user, index) {
	fetch(`https://api.cozy.tv/cache/${user.name}/channelStickers`).then(response => response.ok ? response.json() : undefined).then(json => {
		let isUndefined = json == undefined;
		if (isUndefined) {
			json = { "stickers": [] };
		}
		if (user.cardUrl) {
			json.stickers.unshift({ "_id": `../../a/pcrds/${user.cardUrl.split("/").pop().split(".")[0]}` });
		}
		json.stickers.unshift({ "_id": `../../a/av/${user.avatarUrl.split("/").pop().split(".")[0]}` });
		if (!isUndefined || stickerList[index] == undefined || stickerList[index][0] != user.displayName) {
			stickerList[index] = [user.displayName, JSON.stringify(json), isUndefined];
			GM_setValue("stickercache", stickerList);
			createStickers(stickerList);
		}
	});
}

function getStickers() {
	fetch("https://api.cozy.tv/cache/homepage").then(response => {
		if (!response.ok) {
			setErrorText("Failed to load stickers. Likely rate-limited.");
			return undefined;
		} else {
			return response.json();
		}
	}).then(json => {
		if (json == undefined) {
			return;
		}
		let users = json.users.sort((a, b) => (a["followerCount"] < b["followerCount"]) ? 1 : (a["followerCount"] > b["followerCount"]) ? -1 : (a["name"] < b["name"]) ? 1 : -1);
		let newArr = new Array(users.length);
		users.forEach((user, index) => {
			newArr[index] = stickerList.find(e => e && e[0] == user.displayName);
		});
		stickerList = newArr;
		GM_setValue("stickercache", stickerList);
		let currentUser = window.location.pathname.split("/")[1].toLowerCase();
		if (found = users.find(e => e["name"] == currentUser)) {
			let index = users.indexOf(found);
			currentUpdate = setInterval(() => {
				getUserStickers(found, index);
			}, 90000);
			getUserStickers(found, index);
		}
		if (!hasUpdated) {
			hasUpdated = true;
			users.forEach((user, index) => {
				setTimeout(() => {
					if (user == undefined) {
						return;
					}
					getUserStickers(user, index);
				}, index * 1000);
			});
		}
	});
	createStickers(stickerList);
}

function getTags() {
	fetch("https://raw.githubusercontent.com/KANYEcode/stickers/main/tags.csv").then(response => response.ok ? response.text() : undefined).then(r => {
		if (!r) return;
		tagList = {};
		let lines = r.split(/\r?\n/);
		lines.forEach((e, i) => {
			if (i == 0) return;
			let sections = e.split(",");
			let tags = sections.slice(3).filter(n => n);
			if (tags.length > 0) {
				tagList[sections[1]] = tags;
			}
		});
		GM_setValue("tagcache", tagList);
	});
}

const stickersObserver = new MutationObserver(list => {
	list.forEach(node => {
		if (node.addedNodes.length > 0 && node.addedNodes[0].classList.contains("w-full")) {
			applyStickerHTML();
		}
	});
});

const chatObserver = new MutationObserver(() => {
	document.querySelectorAll(".chat_sticker").forEach(sticker => {
		let id = sticker.style.backgroundImage.match(/(?<=\/).*(?=\.webp)/)[0];
		if (id.match(/stk/)) {
			id = id.split("stk/").pop();
		}
		sticker.setAttribute("sticker-id", id);
		sticker.setAttribute("sticker-url", `${stickerUrlBase}/${id}.webp`);
		sticker.setAttribute("title", id);
		if (GM_getValue("savedstickers", []).includes(id)) {
			sticker.classList.add("saved");
		} else {
			sticker.classList.remove("saved");
		}
		if (!sticker.querySelector(".saved-toggle")) {
			sticker.insertAdjacentHTML("beforeend", `<div class="saved-toggle"></div>`);
		}
	});
});

const reloadObserver = new MutationObserver(() => {
	setObservers();
});


function setObservers() {
	let poll = window.setInterval(() => {
		if (chat = document.querySelector(".overflow-x-hidden.h-full")) {
			clearInterval(poll);
			reloadObserver.disconnect();
			reloadObserver.observe(document.querySelector(".notbody"), { childList: true });
			reloadObserver.observe(document.querySelector(".notbody .flex"), { childList: true });
			stickersObserver.disconnect();
			document.querySelectorAll("div[contenteditable]").forEach(e => stickersObserver.observe(e.parentNode.parentNode, { childList: true }));
			if (stickerElem = document.getElementById("stickers")) {
				stickersObserver.observe(stickerElem, { childList: true });
			}
			chatObserver.disconnect();
			chatObserver.observe(chat, { childList: true });
			if (currentUpdate != undefined) {
				clearInterval(currentUpdate);
			}
			getStickers();
		}
	}, 100);
}

console.log(`Cozy.tv Sticker Menu v${version}`);
getTags();
setObservers();

document.addEventListener("input", e => {
	let t = e.target;
	if (t.id == "sticker-search") {
		document.querySelectorAll(".stickercategory div[sticker-id]").forEach(s => {
			s.style.display = (s.getAttribute("sticker-id").toLowerCase().includes(t.value.toLowerCase().replace("id:", ""))
				|| (!t.value.toLowerCase().startsWith("id:") && s.getAttribute("user-id").toLowerCase().includes(t.value.toLowerCase()))
				|| s.getAttribute("sticker-tags").toLowerCase().includes(t.value.toLowerCase().replace(/ /g, ""))) ? "unset" : "none";
		});
		document.querySelectorAll(".stickercategory").forEach(s => {
			s.style.display = s.querySelector(".liststicker:not([style*='display: none'])") ? "block" : "none";
		});
	}
});

document.addEventListener("click", e => {
	let t = e.target;
	if ((t.closest("a") && t.closest("a").href.startsWith("https://cozy")) || t.matches("li.tab-item-outer:last-of-type")) {
		setObservers();
	} else if (t.classList.contains("liststicker") || (t.classList.contains("chat_sticker") && (e.detail % 2) == 0)) {
		document.querySelector("div[contenteditable]").insertAdjacentHTML("beforeend", `<img style="user-select: none; display: inline; width: 24px; height: 24px;" src="${t.getAttribute("sticker-url")}" data-sticker="${t.getAttribute("sticker-id")}">`);
	} else if (t.classList.contains("show-all-stickers")) {
		t.closest(".z-40.bottom-0, #stickers .flex.p-2").children[2].replaceWith(stickers.content.querySelector("div").cloneNode(true));
		document.querySelector(".only-saved-stickers").classList.remove("bg-gray-500");
		t.classList.add("bg-gray-500");
	} else if (t.classList.contains("only-saved-stickers")) {
		t.closest(".z-40.bottom-0, #stickers .flex.p-2").children[2].replaceWith(saved.content.querySelector("div").cloneNode(true));
		document.querySelector(".show-all-stickers").classList.remove("bg-gray-500");
		t.classList.add("bg-gray-500");
	} else if (t.classList.contains("saved-toggle")) {
		let savedList = GM_getValue("savedstickers", []);
		let stickerId = t.parentNode.getAttribute("sticker-id");
		if (t.parentNode.classList.toggle("saved")) {
			if (!savedList.includes(stickerId)) {
				savedList.push(stickerId);
			}
			if (sticker = stickers.content.querySelector(`div[sticker-id="${stickerId}"]`)) {
				sticker.classList.add("saved");
			}
			document.querySelectorAll(`div[sticker-id="${stickerId}"]`).forEach(e => e.classList.add("saved"));
		} else {
			saved.content.querySelector(`div[sticker-id="${stickerId}"]`).remove();
			savedList = savedList.filter(i => i != stickerId);
			if (sticker = stickers.content.querySelector(`div[sticker-id="${stickerId}"]`)) {
				sticker.classList.remove("saved");
			}
			document.querySelectorAll(`div[sticker-id="${stickerId}"]`).forEach(e => e.classList.remove("saved"));
		}
		GM_setValue("savedstickers", savedList);
		generateSaved();
	}
});

window.addEventListener("popstate", e => {
	if (window.location.pathname != "/") {
		setObservers();
	}
});

document.head.insertAdjacentHTML("beforeend", `<style>
  .savedOnly .stickers > *:not(.saved),
  .savedOnly .username, .savedOnly br {
    display: none
  }

  .liststicker {
    user-select: none;
    width: 56px;
    height: 56px;
    background-position: center center;
    background-size: contain;
    background-repeat: no-repeat;
  }

  .saved-toggle {
    text-align: right;
    color: gold;
    line-height: 12.5px;
  }

  .chat_sticker .saved-toggle {
    display: none;
  }

  .chat_sticker:hover .saved-toggle {
    display: block;
  }

  .saved-toggle::after {
    content: "☆";
  }

  .saved .saved-toggle::after {
    content: "★";
  }
</style>`);