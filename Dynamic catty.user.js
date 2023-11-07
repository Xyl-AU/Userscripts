// ==UserScript==
// @name        Dynamic catty
// @namespace   soyjak.party
// @match       http*://soyjak.party/*
// @match       http*://www.soyjak.party/*
// @exclude     /https?://(?:www.)?soyjak.party/[a-zA-Z\d]*.html/
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.0.24
// @author      Xyl
// @description Load the sharty index and catalog dynamically
// ==/UserScript==

const version = "v1.0.24";
console.log(`Dynamic catty ${version}`);

const namespace = "DynamicCatty.";
function setValue(key, value) {
  if (key == "hiddenthreads" || key == "hiddenimages" || key == "own_posts") {
    localStorage.setItem(key, value);
  } else {
    if (typeof GM_setValue == "function") {
      GM_setValue(namespace + key, value);
    } else {
      localStorage.setItem(namespace + key, value);
    }
  }
}

function getValue(key) {
  if (key == "hiddenthreads" || key == "hiddenimages" || key == "own_posts") {
    return localStorage.getItem(key);
  }
  if (typeof GM_getValue == "function") {
    return GM_getValue(namespace + key);
  } else {
    return localStorage.getItem(namespace + key);
  }
}

function isEnabled(key) {
  let value = getValue(key);
  if (value == null) {
    value = onByDefault.includes(key);
    setValue(key, value);
  }
  return value.toString() == "true";
}

function getJson(key) {
  let value = getValue(key);
  if (value == null) {
    value = "{}";
  }
  return JSON.parse(value);
}

function addToJson(key, jsonKey, value) {
  let json = getJson(key);
  let parent = json;
  jsonKey.split(".").forEach((e, index, array) => {
    if (index < array.length - 1) {
      if (!parent.hasOwnProperty(e)) {
        parent[e] = {};
      }
      parent = parent[e];
    } else {
      parent[e] = value;
    }
  });
  setValue(key, JSON.stringify(json));
  return json;
}

function removeFromJson(key, jsonKey) {
  let json = getJson(key);
  let parent = json;
  let parents = [];
  jsonKey.split(".").forEach((e, index, array) => {
    if (index < array.length - 1) {
      parents.push(parent);
      parent = parent[e];
    } else {
      delete parent[e];
    }
  });
  setValue(key, JSON.stringify(json));
  return json;
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const imageFiles = [".jpg", ".jpe", ".jpeg", ".pjpeg", ".pjp", ".jfif", ".png", ".apng", ".gif", ".bmp", ".tiff", ".avif"];
const audioFiles = [".aac", ".mp3", ".m4a", ".flac", ".wav", ".ogg", ".oga", ".opus", ".wma"];
const videoFiles = [".3gp", ".mpg", ".mpeg", ".mp4", ".m4v", ".m4p", ".ogv", ".webm", ".mkv", ".mov", ".wmv", ".flv"];
const domain = window.location.origin;
const board = window.location.pathname.split("/")[1];

function customAlert(a) {
    document.body.insertAdjacentHTML("beforeend", `
<div id="alert_handler">
  <div id="alert_background" onclick="this.parentNode.remove()"></div>
  <div id="alert_div">
    <a id='alert_close' href="javascript:void(0)" onclick="this.parentNode.parentNode.remove()"><i class='fa fa-times'></i></a>
    <div id="alert_message">${a}</div>
    <button class="button alert_button" onclick="this.parentNode.parentNode.remove()">OK</button>
  </div>
</div>`);
}

function updateAntiSpam() {
  let template = document.createElement("template");
  fetch(window.location.href).then(response => response.text()).then(text => {
    template.innerHTML = text;
    document.querySelectorAll("form[name=post]").forEach(e => {
      e.querySelectorAll(":scope *[style*='display:none']:not(#upload_url), :scope *[type=hidden]:not(#upload_url):not([name='_KAPTCHA_KEY'])").forEach(i => i.remove());
      template.content.querySelectorAll("form[name=post] *[style*=none]:not(#upload_url):not(iframe), form[name=post] *[type=hidden]:not(#upload_url):not([name*='_KAPTCHA'])").forEach(i => e.append(i.cloneNode(true)));
    });
  });
}

setInterval(() => updateAntiSpam(), 300000);

function initialise() {
  let pageSelector = `<div class="pages page-selector">`;
  document.querySelector(".pages").querySelectorAll("a").forEach(e => pageSelector += `<a href="${e.href}">${e.innerText}</a>`);
  pageSelector += `<a href="${window.location.origin}/${board}/#catalog">Catalog</a></div><hr>`;
  document.querySelectorAll(".subtitle a[href*=catalog]").forEach(e => e.remove());
  document.querySelectorAll(`form[name=postcontrols], .pages, form[action="/search.php"]`).forEach(e => e.remove());
  document.querySelector("header").insertAdjacentHTML("beforeend", `<a href="javascript:void(0)" id="show-post-form">Post Form]</a>`);
  let settings = JSON.parse(localStorage.getItem("catalog"));
  let sort = getValue("lastSort") ? getValue("lastSort") : "bump:desc";
  let size = getValue("imageSize") ? getValue("imageSize") : "small";
  document.querySelector(".boardlist.bottom").insertAdjacentHTML("beforebegin", `
<div id="content-container">
  ${pageSelector}
  <div id="top-bar">
    <span>Sort by:</span>
    <select id="sort_by" style="display: inline-block">
      <option ${sort == "bump:desc" ? `selected="" ` : ""}value="bump:desc">Bump order</option>
      <option ${sort == "time:desc" ? `selected="" ` : ""}value="time:desc">Creation date</option>
      <option ${sort == "reply:desc" ? `selected="" ` : ""}value="reply:desc">Reply count</option>
      <option ${sort == "random:desc" ? `selected="" ` : ""}value="random:desc">Random</option>
    </select>
    <span>Image size:</span>
    <select id="image_size" style="display: inline-block">
      <option ${size == "vsmall" ? `selected="" ` : ""}value="vsmall">Very small</option>
      <option ${size == "small" ? `selected="" ` : ""}value="small">Small</option>
      <option ${size == "large" ? `selected="" ` : ""}value="large">Large</option>
    </select>
    <form style="display: inline-block; margin-bottom: 0px;" action="/search.php">
      <p>
        <input type="text" name="search" placeholder="${board} search">
        <input type="hidden" name="board" value="${board}">
        <input type="submit" value="Search">
      </p>
    </form>
    <a class="reload-button sf-disabled" href="javascript:void(0)">Loading...</a>
    <a id="hidden-threads-toggle" href="javascript:void(0)" style="display: none;"></a>
  </div>
  <div id="dyn-content"></div>
  ${pageSelector}
</div>
  `);
  document.getElementById("sort_by").onchange = () => {
    let catalog = document.querySelector("#dyn-content.theme-catalog")
    let sortedThreads = sortThreads(catalog.querySelectorAll(".catty-thread"));
    catalog.innerHTML = "";
    catalog.append(...sortedThreads);
    setValue("lastSort", document.getElementById("sort_by").value);
  };
  document.getElementById("image_size").onchange = (e) => {
    document.querySelectorAll(".catty-thread > .thread").forEach(t => {
      t.classList.replace("grid-size-vsmall", `grid-size-${e.target.value}`);
      t.classList.replace("grid-size-small", `grid-size-${e.target.value}`);
      t.classList.replace("grid-size-large", `grid-size-${e.target.value}`);
    });
    setValue("imageSize", document.getElementById("image_size").value);
  };
}

function loadCatalog(manual) {
  if (manual) {
    window.stop();
  }
  const size = document.getElementById("image_size").value;
  let threadHtml = "";
  let loadButtons = document.querySelectorAll(".reload-button");
  document.querySelectorAll(".page-selector .selected").forEach(e => e.classList.remove("selected"));
  document.querySelectorAll(`.pages a[href$='#catalog']`).forEach(e => {
    e.innerText = "Loading...";
    e.classList.add("selected");
  });
  fetch(`${domain}/${board}/catalog.json`).then(response => response.json()).then(json => {
    document.body.classList.add("sf-catty");
    document.body.classList.remove("sf-index");
    json.forEach(page => {
      page.threads.forEach(thread => {
        threadHtml += makeCatalogThread(thread, page.page + 1, size);
      });
    });
    let unsortedThreads = document.createElement("template");
    unsortedThreads.innerHTML = threadHtml;
    let threadList = Array.from(unsortedThreads.content.querySelectorAll(".catty-thread"));
    let content = document.getElementById("dyn-content");
    content.classList.add("theme-catalog");
    content.classList.remove("theme-index");
    content.innerHTML = "";
    content.append(...sortThreads(threadList));
    document.getElementById("hidden-threads-toggle").style.display = document.querySelector(".catty-thread.hidden") ? "inline" : "none";
    content.insertAdjacentHTML("beforeend", "<hr>");
    document.querySelectorAll(`.pages a[href$='#catalog']`).forEach(e => {e.innerText = "Catalog"});
    if (manual) {
       document.querySelector("form[name=post]").scrollIntoView(false);
    }
    loadButtons.forEach(e => {
      e.innerText = "Reload";
      e.classList.remove("sf-disabled");
    });
    document.dispatchEvent(new CustomEvent("dyn_catty_update"));
  }).catch(e => {
    console.log(`Catalog fetch failed: ${e}`);
    document.querySelectorAll(`.pages a[href$='#catalog']`).forEach(e => {
      e.innerText = "Load Failed";
      e.classList.remove("sf-disabled");
    });
  });
  updatePageCount();
}

function sortThreads(threadList) {
  let sort = document.getElementById("sort_by").value;
  let settings =

  threadList = [...threadList];
  if (sort == "random:desc") {
    console.log("test")
    for (let i = threadList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [threadList[i], threadList[j]] = [threadList[j], threadList[i]];
    }
    return threadList;

  }
  return threadList.sort((a, b) => {
    const stickyA = a.getAttribute("data-sticky") == "true" ? 1 : 0;

    const stickyB = b.getAttribute("data-sticky") == "true" ? 1 : 0;
    if (stickyA != stickyB) {
      return ((stickyA < stickyB) ? 1 : -1);
    }
    let condA, condB;
    switch(sort) {
      case "bump:desc":
        condA = parseInt(a.getAttribute("data-bump"));
        condB = parseInt(b.getAttribute("data-bump"));
        break;
      case "time:desc":
        condA = parseInt(a.getAttribute("data-time"));
        condB = parseInt(b.getAttribute("data-time"));
        break;
      case "reply:desc":
        condA = parseInt(a.getAttribute("data-reply"));
        condB = parseInt(b.getAttribute("data-reply"));
        break;
    }
    const idA = parseInt(a.getAttribute("data-id"));
    const idB = parseInt(b.getAttribute("data-id"));
    return ((condA < condB) ? 1 : ((condA > condB) ? -1 : ((idA < idB) ? 1 : -1)));
  });
}

function getThumbnailUrl(tim, ext, reqBoard) {
  if (tim == "") {
    return ["/static/deleted.png", false];
  } else if (imageFiles.includes(ext)) {
    return [`/${reqBoard}/thumb/${tim}${ext}`, true];
  } else if (audioFiles.includes(ext)) {
    return ["/static/speaker.gif", false];
  } else if (videoFiles.includes(ext)) {
    return [`/${reqBoard}/thumb/${tim}.jpg`, true];
  } else if (ext == ".pdf") {
    return ["/static/pdf.png", false];
  } else if (ext == ".zip") {
    return ["/static/zip.png", false];
  } else {
    return ["/static/file.png", false];
  }
}

function getFilesize(filesize) {
  let multiplier = 1024;

  if (Math.abs(filesize) < multiplier) {
    return filesize + ' B';
  }

  let units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let u = -1;
  const r = 10**2;

  do {
    filesize /= multiplier;
    ++u;
  } while (Math.round(Math.abs(filesize) * r) / r >= multiplier && u < units.length - 1);

  return filesize.toFixed(2) + " " + units[u];
}

function timestampToRelativeTime(timestamp) {
  let currentTime = Math.floor(Date.now() / 1000);
  let difference = currentTime - timestamp;

  if (difference < 10) {
    return "Just now";
  } else if (difference < 60) {
    return `${difference} seconds ago`;
  } else if (difference < 120) {
    return "1 minute ago";
  } else if (difference < 3600) {
    return `${Math.floor(difference/60)} minutes ago`;
  } else if (difference < 7200) {
    return "1 hour ago";
  } else if (difference < 86400) {
    return `${Math.floor(difference/3600)} hours ago`;
  } else if (difference < 172800) {
    return "1 day ago";
  } else if (difference < 2678400) {
    return `${Math.floor(difference/86400)} days ago`;
  } else if (difference < 5356800) {
    return "1 month ago";
  } else if (difference < 31536000) {
    return `${Math.floor(difference/2678400)} months ago`;
  } else if (difference < 63072000) {
    return "1 year ago";
  } else {
    return `${Math.floor(difference/31536000)} years ago`;
  }
}

function timestampToReadableTime(timestamp) {
  let time = new Date(timestamp * 1000);
  return `${("0" + (time.getMonth() + 1)).slice(-2)}/${("0" + time.getDate()).slice(-2)}/${time.getYear().toString().slice(-2)} ` +
    `(${weekdays[time.getDay()]}) ${("0" + time.getHours()).slice(-2)}:${("0" + time.getMinutes()).slice(-2)}:${("0" + time.getSeconds()).slice(-2)}`;
}

function timestampToUTCString(timestamp) {
  let time = new Date(timestamp * 1000);
  return `${time.getUTCFullYear()}-${("0" + (time.getUTCMonth() + 1)).slice(-2)}-${("0" + time.getUTCDate()).slice(-2)}T` +

    `${("0" + time.getUTCHours()).slice(-2)}:${("0" + time.getUTCMinutes()).slice(-2)}:${("0" + time.getUTCSeconds()).slice(-2)}Z`
}

function makeCatalogThread(thread, page, size) {
  let hidden;
  try { hidden = getJson("hiddenthreads")[board].hasOwnProperty(thread.no) } catch { hidden = false };
  let threadTime = new Date(thread.time * 1000);
  let hoverTime= `${months[threadTime.getMonth()]} ${("0" + threadTime.getDate()).slice(-2)} ${("0" + threadTime.getHours()).slice(-2)}:${("0" + threadTime.getMinutes()).slice(-2)}`;
  let imageThumbnail = getThumbnailUrl(thread.tim, thread.ext, board);
  let imageHidden;
  try { imageHidden = getJson("hiddenimages")[board][thread.no]["index"].includes(0) } catch { imageHidden = false };
  return `
<div class="catty-thread${hidden ? " hidden" : ""}" data-reply="${thread.replies}"
     data-bump="${thread.last_modified}" data-time="${thread.time}" data-id="${thread.no}" data-sticky="${thread.sticky == 1}" data-locked="${thread.locked == 1}">
    <div class="thread grid-li grid-size-${size}${imageHidden ? " image-hidden" : ""}">
        <a href="/${board}/thread/${thread.no}${!!thread.semantic_url ? `-${thread.semantic_url}` : ""}.html" file-source="${domain}/${board}/src/${thread.tim + thread.ext}">
          <img ${imageHidden ? "hidden-src" : "src"}="${imageThumbnail[0]}" id="img-${thread.no}" data-subject="${thread.hasOwnProperty("sub") ? thread.sub : ""}" data-name="${thread.name}"
               class="${board} thread-image${imageThumbnail[1] ? " hoverable" : ""}" title="${hoverTime}" onerror="fixThumbnail(this)">
        </a>
        <div class="replies">

            <span>${thread.sticky == 1 ? "📌" : ""}${thread.locked == 1 ? "🔒" : ""}</span>
            <strong>R: ${thread.replies} / I: ${1 + thread.images + thread.omitted_images + (thread.extra_files ? thread.extra_files.length : 0)} / P: ${page}</strong>

            <p class="intro"><span class="subject">${thread.hasOwnProperty("sub") ? thread.sub : ""}</span></p>
            ${thread.com}
        </div>
    </div>
</div>`;
}

function makeIndexFile(multifile, postNo, reqBoard, index, tn_h, tn_w, h, w, fsize, filename, ext, tim) {
  if (tim == "") {
    return `<div class="file"><img class="post-image deleted" src="/static/deleted.png" alt=""></div>`
  }
  let thumbnail = getThumbnailUrl(tim, ext, reqBoard);
  let hidden;
  try { hidden = getJson("hiddenimages")[reqBoard][postNo]["index"].includes(index) } catch { hidden = false };
  let fileHtml = `
<div class="file${multifile ? " multifile" : ""}${hidden ? " image-hidden" : ""}">
  <p class="fileinfo"${multifile ? `style="width: ${tn_w + 40}px"` : ""}>
    <span>File <small>(<a class="hide-image-link" href="javascript:void(0)"></a>) </small>: </span>
    <a href="/${reqBoard}/src/${tim}${ext}">${tim}${ext}</a>
    <span class="unimportant">(${getFilesize(fsize)}, ${imageFiles.includes(ext) || videoFiles.includes(ext) ? `${w}x${h}, ` : ""}<a download="${filename}${ext}" href="/${reqBoard}/src/${tim}${ext}" title="Save as original filename (${filename}${ext})">${filename.length > 25 ? filename.substr(0, 26) + "…" : filename}${ext}</a>)</span>
    ${videoFiles.includes(ext) || audioFiles.includes(ext) ? `<span class="loop-option play-once">[play once]</span><span class="loop-option loop selected-lo">[loop]</span>` : ""}
  </p>
  <a href="/${reqBoard}/src/${tim}${ext}" target="_blank" type=${ext} file-source="${domain}/${reqBoard}/src/${tim}${ext}">
    <img class="post-image ${thumbnail[1] ? " hoverable" : ""}" ${hidden ? "hidden-src" : "src"}="${thumbnail[0]}" style="width:${tn_w}px;height:${tn_h}px" alt="" onerror="fixThumbnail(this)">
  </a>
</div>`
  return fileHtml;
}

function makeIndexThread(thread, reqBoard, expanded) {
  let opPost = thread.posts[0].no;
  let expandedAbove = -1;
  let lastPost = -1;
  if (expanded) {
    expandedAbove = parseInt(document.querySelector(`#thread_${opPost} .reply`).id.split("_")[1]);
    lastPost = parseInt(document.querySelector(`#thread_${opPost} .reply:last-of-type`).id.split("_")[1]);
  }
  let hidden;
  try { hidden = getJson("hiddenthreads")[reqBoard].hasOwnProperty(opPost) } catch { hidden = false }
  let threadHtml = `<div class="thread index-thread${hidden ? " thread-hidden" : ""}" id="thread_${opPost}" data-board="${reqBoard}">
  <a class="hide-toggle" style="float: left; margin-right: 5px;" href="javascript:void(0)"></a>`;
  thread.posts.forEach((post, index) => {
    let isOwnPost;
    try { isOwnPost = getJson("own_posts")[reqBoard].includes(post.no.toString()) } catch { isOwnPost = false }
    if (expanded && post.no > lastPost) {
      return;
    }
    let multifile = post.hasOwnProperty("extra_files");
    let files = [];
    if (post.hasOwnProperty("filename")) {
      files.push(makeIndexFile(multifile, post.no, reqBoard, 0, post.tn_h, post.tn_w, post.h, post.w, post.fsize, post.filename, post.ext, post.tim));
    }
    if (multifile) {
      post.extra_files.forEach((e, index) => {
        files.push(makeIndexFile(multifile, post.no, reqBoard, index + 1, e.tn_h, e.tn_w, e.h, e.w, e.fsize, e.filename, e.ext, e.tim))
      })
    }
    let timeText = timestampToReadableTime(post.time);
    let type = index == 0 ? "op" : "reply";

    let postActions = `\
<form class="post-actions" method="post" style="margin:10px 0 0 0" action="/post.php">
  <div style="text-align:right">${type == "reply" ? "<hr>" : ""}
    <input type="hidden" name="delete_${post.no}">
    <label for="password_${post.no}">Password</label>: <input id="password_${post.no}" type="password" name="password" size="11" maxlength="18"><input title="Delete file only" type="checkbox" name="file" id="delete_file_${post.no}"><label for="delete_file_${post.no}">File</label><input type="submit" name="delete" value="Delete"><br>\
    <label for="reason_${post.no}">Reason</label>: <input id="reason_${post.no}" type="text" name="reason" size="20" maxlength="100"> <input type="submit" name="report" value="Report">
  </div>
  <input type="hidden" name="board" value="${reqBoard}">
</form>`

    threadHtml += `
    ${type == "op" ? `<div class="files">${files.join("")}</div>` : ""}
    <div class="post ${type}${multifile ? " nowrap" : ""}${expanded && post.no < expandedAbove && type == "reply" ? " omitted-post" : ""}" id="${type}_${post.no}">
      <p class="intro">
        <input type="checkbox" class="delete" name="delete_${post.no}" id="delete_${post.no}">
        <label for="delete_${post.no}">
        ${post.hasOwnProperty("sub") ? `<span class="subject">${post.sub}</span>` : ""}
          <span class="poster ${post.hasOwnProperty("capcode") ? post.capcode : ""}">
            ${post.hasOwnProperty("email") ? `<a class="email" href="mailto:${post.email}">` : ""}
            <span class="name">${post.hasOwnProperty("name") ? post.name : ""}${isOwnPost ? `<span class="own_post"> (You)</span>` : ""}</span>${post.hasOwnProperty("trip") ? `<span class="trip">${post.trip}</span>` : ""}${post.hasOwnProperty("email") ? `</a>` : ""}</span>
          ${post.hasOwnProperty("country") ? `<img class="flag" src="/static/flags/${post.country.toLowerCase()}.png" style="width:16px; height:11px;" alt="${post.country_name}" title="${post.country_name}">` : ""}
          <time datetime="${timestampToUTCString(post.time)}" title="${timeText}">${timestampToRelativeTime(post.time)}</time>
        </label>
        <a class="post_no" id="post_no_${post.no}" onclick="highlightReply(${post.no})" href="/${reqBoard}/thread/${type == "op" ? post.no : opPost}.html#${post.no}">No.</a><a class="post_no" onclick="citeReply(${post.no})" href="/${reqBoard}/thread/${opPost}${!!thread.semantic_url ? `-${thread.semantic_url}` : ""}.html#q${post.no}">${post.no}</a><span class="mentioned unimportant"></span>
        ${post.sticky == 1 ? "📌" : ""}${post.locked == 1 ? "🔒" : ""}
      </p>
      ${type == "reply" && files.length > 0 ? `<div class="files">${files.join("")}</div>` : ""}
      <div class="body">${type == "op" ? postActions : ""}${post.hasOwnProperty("com") ? post.com : ""}</div>
      ${type == "reply" ? postActions : ""}
      ${type == "op" && post.omitted_posts > 0 ? `<span class="omitted"><span>${post.omitted_posts} posts${post.omitted_images > 0 ? ` and ${post.omitted_images} image replies` : ""} omitted. </span><a class="thread-expand" href="javascript:void(0)"></a></span>` : ""}
      ${type == "op" && expanded ? `${document.querySelector(`#thread_${opPost} .omitted`).outerHTML}` : ""}
    </div>${type == "reply" ? "<br>" : ""}`;
  })
  threadHtml += `<br class="clear"><hr></div>`
  return threadHtml;
}

function postFixes() {
  document.querySelectorAll(".body a[onclick^='highlightReply']").forEach(e => {
    let isOwnPost;
    try { isOwnPost = getJson("own_posts")[e.href.match(/(?<=soyjak\.party\/)[a-zA-Z0-9]*/)].includes(e.innerText.match(/\d*$/).toString()) } catch { isOwnPost = false }
    let o = document.querySelector(`#op_${e.innerText.substr(2)}, #reply_${e.innerText.substr(2)}`);
    if (o && e.closest(".thread") == o.closest(".thread")) {
      e.href = `#${e.innerText.substr(2)}`
      let replyId = e.closest(".post").id.split("_")[1];
      if (!o.querySelector(`.mentioned a[href="#${replyId}"]`)) {
        o.querySelector(".mentioned").insertAdjacentHTML("beforeend", `<a class="mentioned-${replyId}" onclick="highlightReply(${replyId});" href="#${replyId}">&gt;&gt;${replyId}</a>`);
      }
    }
    if (!e.nextElementSibling || e.nextElementSibling.nodeName != "SMALL") {
      if (o && o.classList.contains("op") && e.closest(".thread") == o.closest(".thread")) {
        e.insertAdjacentHTML("afterend", `<small class="op-indicator"> (OP)</small>`);
      }
      if (isOwnPost) {
        e.insertAdjacentHTML("afterend", `<small class="you-indicator"> (You)</small>`);
      }
    }
  });
  let password = localStorage.getItem("password");
  document.querySelectorAll(".post-actions input[name=password]").forEach(e => {
    e.value = password;
  });
}

function loadFullThread(threadNo, reqBoard, showOmitted, callback = []) {
  if (op = document.getElementById(`thread_${threadNo}`)) {
    if (op.classList.contains("loading-omitted")) {
      return;
    }
    if (showOmitted) {
      op.classList.add("loading-omitted");
    }
  }
  fetch(`${domain}/${reqBoard}/thread/${threadNo}.json`).then(response => response.json()).then(json => {
    let threadHTML = makeIndexThread(json, reqBoard, document.querySelector(`div[id*="${threadNo}"]`));
    if ((thread = document.querySelector(`#thread_${threadNo}`)) && document.querySelector(`div[id*="${threadNo}"]`)) {
      thread.outerHTML = threadHTML;

    } else {
      if (!document.querySelector("#external-threads")) {
        document.querySelector("#dyn-content").insertAdjacentHTML("beforeend", `<div id="external-threads"></div>`)
      }
      document.querySelector("#external-threads").insertAdjacentHTML("beforeend", threadHTML);
    }
    postFixes();
    let newThread = document.querySelector(`#thread_${threadNo}`);
    if (showOmitted) {
      newThread.classList.remove("loading-omitted");
      newThread.classList.toggle("expand-omitted");
    }
    document.dispatchEvent(new CustomEvent("dyn_update", {detail: newThread.querySelectorAll(".post")}));
    if (callback.length > 0) {
      callback[0](callback[1]);
    }
  });
}

function loadIndex(page, manual) {
  if (manual) {
    window.stop();
  }
  const size = document.getElementById("image_size").value;
  let threadHtml = "";
  let loadButtons = document.querySelectorAll(".reload-button");
  document.querySelectorAll(".page-selector .selected").forEach(e => e.classList.remove("selected"));
  document.querySelectorAll(`.pages a[href$='#p${page + 1}']`).forEach(e => {
    e.innerText = "Loading...";
    e.classList.add("selected");
  });
  fetch(`${domain}/${board}/${page}.json`).then(response => response.json()).then(json => {
    document.body.classList.remove("showing-hidden");
    document.body.classList.add("sf-index");
    document.body.classList.remove("sf-catty");
    json["threads"].forEach(thread => {
        threadHtml += makeIndexThread(thread, board, false);
    });
    let content = document.getElementById("dyn-content");
    content.classList.add("theme-index");
    content.classList.remove("theme-catalog");
    content.innerHTML = threadHtml;
    postFixes();
    document.querySelectorAll(`.pages a[href$='#p${page + 1}']`).forEach(e => {e.innerText = page + 1});
    if (manual) {
       document.querySelector("form[name=post]").scrollIntoView(false);
    }
    loadButtons.forEach(e => {
      e.innerText = "Reload";
      e.classList.remove("sf-disabled");
    });
    if (hash = window.location.hash.match(/#\d*/)) {
      if (target = document.querySelector(`#op_${hash[0].substr(1)}, #reply_${hash[0].substr(1)}`)) {
        target.closest(".thread").scrollIntoView(true);
        target.classList.add("highlighted");
      }
    }
    document.dispatchEvent(new CustomEvent("dyn_update", {detail: document.querySelectorAll(".post")}));
  }).catch(e => {
    console.log(`Index fetch failed: ${e}`);
    document.querySelectorAll(`.pages a[href$='#p${page + 1}']`).forEach(e => {
      e.innerText = "Load Failed";
      e.classList.remove("sf-disabled");
    });
  });
  updatePageCount();
}

function updatePageCount() {
  let pageSelector = "";
  fetch(`${domain}/${board}/threads.json`).then(response => response.json()).then(json => {
    json.forEach(e => {
      pageSelector += `<a href="#p${e.page + 1}"${document.querySelector(`a.selected[href$='#p${e.page + 1}']`) ? ` class="selected"` : ""}>${e.page + 1}</a>`;
    });
    pageSelector += `<a href="#catalog"${document.querySelector(`a.selected[href$='#catalog']`) ? ` class="selected"` : ""}>Catalog</a>`;
    document.querySelectorAll(".page-selector").forEach(e => e.innerHTML = pageSelector);
  });
}

function dynContent() {
  if (window.location.href.endsWith("index.html")) {
    window.location.replace(window.location.href.slice(0, -10));
  } else if (window.location.href.endsWith("catalog.html")) {
    window.location.replace(`${domain}/${board}#catalog`);
  } else if ((number = window.location.pathname.match(/\d*(?=\.html$)/)) && !window.location.pathname.match("/thread/")) {
    history.replaceState(null, null, `${domain}/${board}/#p${number[0]}`);
  }
  document.querySelectorAll("a").forEach(e => {
    if (e.href.match("soyjak.party")) {
      e.href = e.href.replace(/(\/[a-zA-Z0-9]*)\/\//, "$1/").replace("index.html", "").replace("catalog.html", "#catalog").replace(/(soyjak.party\/[a-zA-Z0-9]*\/)([0-9]*).html/, "$1#p$2");
    }
    if (e.matches(".pages .selected")) {
      e.href = `${domain}/${board}/#p${e.innerText}`
    }
  });
  if (document.body.classList.contains("active-index")) {
    addExtras();
    initialise();
    if (window.location.hash == "#catalog") {
      history.replaceState(null, null, " ");
      setValue("lastViewed", "catalog");
      loadCatalog(false);
    } else if (window.location.hash.match(/(index|p\d+)/)) {
      setValue("lastViewed", "index");
      let page = window.location.hash.substring(2);
      if (!page[0].match(/\d/)) {
        history.replaceState(null, null, " ");
        page = 1;
      }
      page = parseInt(page) - 1;
      loadIndex(page, false);
    } else if (getValue("lastViewed") == "catalog") {
      loadCatalog(false);
    } else {
      loadIndex(0, false);
    }
  } else if (document.body.classList.contains("active-thread")) {
    setValue("hiddenimages", getValue("hiddenimages"));
    document.addEventListener("click", e => {
      if (e.target.classList.contains("show-image-link") || e.target.classList.contains("hide-image-link")) {
        setValue("hiddenimages", localStorage.getItem("hiddenimages"));
      }
    });
    document.head.insertAdjacentHTML("beforeend", `<style>.banner a, #thread-links a { padding: 0px !important; }</style>`)
    document.querySelectorAll(`.banner, #thread-links`).forEach(e => {
      let isBanner = e.classList.contains("banner");
      let position = isBanner ? "bottom" : "top";
      e.innerHTML = `
${isBanner ? `<span>Posting mode: Reply</span>` : ""}
<a class="index-button${isBanner ? " unimportant" : ""}" href="${domain}/${board}/#index">[Index]</a>
<a class="catalog-button${isBanner ? " unimportant" : ""}" href="${domain}/${board}/#catalog">[Catalog]</a>
<a class="${position}-button${isBanner ? " unimportant" : ""}" href="${domain}${window.location.pathname}#${position}">[Go to ${position.charAt(0).toUpperCase() + position.slice(1)}]</a>
      `
      if (!isBanner) {
        let poll = setInterval(() => {
        if (updater = document.querySelector("#updater")) {
          clearInterval(poll);
          e.append(updater);
          document.querySelector("#post-moderation-fields").replaceWith(document.querySelector("#thread_stats"));
          document.querySelector("a[name=bottom] + a[href*=catalog]").remove();
        }}, 10);
      }
    });
  }
}

dynContent();

function adjustHoverPos(x, y) {
  if (hover = document.querySelector("#sharty-preview")) {
    if (x > document.documentElement.clientWidth / 2) {
      hover.style.maxWidth = `${x - 5}px`;
      hover.style.left = "";
      hover.style.right = `${document.documentElement.clientWidth - x + 5}px`
    } else {
      hover.style.left = `${x + 5}px`
      hover.style.right = "";
      hover.style.maxWidth = `${document.documentElement.clientWidth - x + 5}px`;
    }
    hover.style.maxHeight = `${document.documentElement.clientHeight}px`;
    if (hover.offsetHeight > document.documentElement.clientHeight) {
      hover.style.top = "0px";
    } else {
      if (y < hover.offsetHeight/2) {
        hover.style.top = `0px`;
      } else if (document.documentElement.clientHeight - y < hover.offsetHeight/2) {
        hover.style.top = `${document.documentElement.clientHeight - (hover.offsetHeight)}px`;
      } else {
        hover.style.top = `${y - (hover.offsetHeight/2)}px`;
      }
    }
  }
}

function addExtras() {
  document.addEventListener("click", e => {
    let t = e.target;
    let p = t.parentNode;
    if (thread = t.closest(".catty-thread")) {
      if (e.shiftKey || (e.detail == 3 && (document.documentElement.matches(".mobile-style") || document.querySelector("input[id=desktop-triple-click]").checked))) {
        e.preventDefault();
        window.getSelection().removeAllRanges();
        if (thread.classList.toggle("hidden")) {
          addToJson("hiddenthreads", `${board}.${thread.getAttribute("data-id")}`, Math.floor(Date.now() / 1000));
        } else {
          removeFromJson("hiddenthreads", `${board}.${thread.getAttribute("data-id")}`);
        }
        if (document.querySelector(".catty-thread.hidden")) {
          document.getElementById("hidden-threads-toggle").style.display = "inline";
        } else {
          document.getElementById("hidden-threads-toggle").style.display = "none";
          document.body.classList.remove("showing-hidden");
        }
      }
      thread.querySelector(".thread").classList.toggle("expanded");
    } else if (t.classList.contains("reload-button") && !t.classList.contains("sf-disabled")) {
      document.querySelectorAll(".reload-button").forEach(e => {
        e.classList.add("sf-disabled");
      });
      if (document.getElementById("dyn-content").classList.contains("theme-index")) {
        loadIndex(0, false);
      } else {
        loadCatalog(false);

      }
    } else if (t.id == "show-post-form") {
      document.querySelector("form[name=post]").classList.toggle("sf-hidden");
      t.classList.toggle("hiding");
    } else if (t.classList.contains("loop-option") && !t.classList.contains("selected-lo")) {
      t.parentNode.querySelector(".selected-lo").classList.remove("selected-lo");
      t.classList.add("selected-lo");
      if (video = t.closest(".file").querySelector("video")) {
        if (t.classList.contains("loop")) {
          video.setAttribute("loop", "true");
        } else {
          video.removeAttribute("loop")
        }
      }
    } else if (t.matches(".file > a > img")) {
      let type = p.getAttribute("type");
      if (imageFiles.includes(type)) {
        e.preventDefault();
        if (!p.querySelector(".full-image")) {
          let image = document.createElement("img");
          image.classList.add("full-image");
          image.setAttribute("alt", "Fullsized image");
          p.classList.add("loading");
          p.append(image);
          image.addEventListener("load", e => {
            p.classList.remove("loading");
            t.closest(".file").classList.toggle("expanded");
          });
          image.src = p.href;
          return;
        }
      } else if (videoFiles.includes(type) || audioFiles.includes(type)) {
        e.preventDefault();
        if (!p.querySelector(".full-video")) {
          p.insertAdjacentHTML("beforeend", `
            <div class="full-video">
              <img class="collapse-video" src="/static/collapse.gif" alt="[-]" title="Collapse video">
              <video src=${p.href} ${p.closest("div.file").querySelector(".loop.selected-lo") ? `loop=""`: ""} controls="">Your browser does not support HTML5 video.</video>
            </div>
          `);
        }
        p.querySelector("video").play();
      }
      t.closest(".file").classList.toggle("expanded");
    } else if (t.classList.contains("collapse-video")) {
      e.preventDefault();
      t.closest(".file").classList.remove("expanded");
      t.parentNode.querySelector("video").pause();
    } else if (t.matches(".body a[onclick^='highlightReply'], .mentioned a")) {
      if (hover = document.querySelector("#sharty-preview")) {
        t.closest(".thread").classList.remove("loading-hover");
        hover.remove();
      }
      let postNumber = t.innerText.substr(2);
      if (o = document.querySelector(`#op_${postNumber}, #reply_${postNumber}:not(.omitted-post)`)) {
        o.classList.add("click-highlight");
        window.scrollTo({top: o.getBoundingClientRect().top - document.querySelector(".boardlist").getBoundingClientRect().height + window.pageYOffset});
      } else {
        window.location = `${domain}/${board}/thread/${t.closest(".thread").id.split("_")[1]}.html${t.getAttribute("href")}`;
      }
    } else if (t.classList.contains("hide-toggle")) {
      t.parentNode.classList.toggle("thread-hidden") ? addToJson("hiddenthreads", `${board}.${t.parentNode.id.split("_")[1]}`, Math.floor(Date.now() / 1000)) : removeFromJson("hiddenthreads", `${board}.${t.parentNode.id.split("_")[1]}`);
    } else if (t.classList.contains("hide-image-link")) {
      let img = t.closest(".file").querySelector("img");
      let postId = t.closest(".post, .thread").id.split("_")[1];
      img.outerHTML = t.closest(".file").classList.toggle("image-hidden") ? img.outerHTML.replace("src", "hidden-src") : img.outerHTML.replace("hidden-src", "src");
      let json = addToJson("hiddenimages", `${board}.${postId}.index`, [...t.closest(".files").querySelectorAll(":scope > .file")].flatMap((e, index) => e.classList.contains("image-hidden") ? index : []));
      json[board][postId]["index"].length == 0 ? removeFromJson("hiddenimages", `${board}.${postId}`) : addToJson("hiddenimages", `${board}.${postId}.ts`, Math.floor(Date.now() / 1000));
    } else if (t.id == "hidden-threads-toggle") {
      document.body.classList.toggle("showing-hidden");
    } else if (t.classList.contains("thread-expand")) {
      let op = t.closest(".thread");
      if (!op.querySelector(".omitted-post")) {
        loadFullThread(op.id.split("_")[1], board, true);
      } else {
        op.classList.toggle("expand-omitted");
      }
    } else if (t.matches(".post-actions input[type=submit]")) {
      e.preventDefault();
      let p = t.parentNode;
      let formData = new FormData();
      formData.append("json_response", 1);
      formData.append(t.name, t.value);
      formData.append("board", board);
      formData.append(p.querySelector("input[name^=delete_]").name, "");
      if (t.name == "delete") {
        formData.append("password", p.querySelector("input[name=password]").value);
        if (p.querySelector("input[name=file]").checked) {
          formData.append("file", p.querySelector("input[name=file]").value);
        }
      } else {
        formData.append("reason", p.querySelector("input[name=reason]").value);
      }
      t.setAttribute("disabled", "disabled");
      fetch(`${domain}/post.php`, {
        method: "POST",
        body: formData
      }).then(response => response.json()).then(json => {
        t.removeAttribute("disabled");
        if (json.hasOwnProperty("error")) {
          customAlert(json.error);
        } else {
          if (t.name == "delete") {
            window.location.reload();
          } else {
            customAlert("Reported post.");

            p.querySelector("input[name=reason]").value = "";
            t.closest(".post").querySelector("input.delete").click();
          }
        }
      }).catch(e => {
        t.removeAttribute("disabled");
        customAlert("An unknown error occured");
      })
    }
  });

  document.addEventListener("mouseover", e => {
    let t = e.target;
    if (t.matches(".body a[onclick^='highlightReply']:not(.dead), .mentioned a, .body a[href^='/'][href*='/thread/']")) {
      if (!document.querySelector("#dyn-content")) {
        return;
      }
      document.querySelectorAll(".click-highlight").forEach(e => e.classList.remove("click-highlight"));
      function highlight(e) {
        if (!t.matches(":hover")) {
          return;
        }
        let postNumber = t.innerText.match(/\d+/)[0];
        let thread = t.closest(".thread");
        if (o = document.querySelector(`#reply_${postNumber}, #op_${postNumber}`)) {
          let bound = o.getBoundingClientRect();
          if (!document.getElementById("sharty-preview") && (bound.top < 0 || bound.bottom > document.documentElement.clientHeight || o.matches(".thread:not(.expand-omitted) .omitted-post"))) {
            document.body.insertAdjacentHTML("beforeend", `<div id="sharty-preview" class="post reply" style="position:fixed;display:block;z-index:500">${o.classList.contains("op") ? o.previousElementSibling.outerHTML + "<br>" : ""}${o.innerHTML}</div>`);
            let hover = document.getElementById("sharty-preview");
            hover.querySelector(".body").style.maxHeight = "unset";
            if (expander = hover.querySelector(".sf-expander")) {
              expander.previousElementSibling.remove();
              expander.remove();

            }
            hover.querySelector("div").classList.add("highlighted");
            adjustHoverPos(e.x, e.y);
          }
          document.querySelectorAll(".highlighted:not([id*=postNumber])").forEach(e => e.classList.remove("highlighted"));
          o.classList.add("highlighted");
        } else {
          if (!t.classList.contains("dead")) {
            if (t.closest(".thread").querySelector(".omitted-post")) {
              t.classList.add("dead");
              t.insertAdjacentHTML("afterend", " <small>(Dead)</small>");
              return;
            }
            if (!thread.classList.contains("loading-hover")) {
              thread.classList.add("loading-hover");
              if (t.matches(".body a") && t.href.match("/thread/")) {
                loadFullThread(t.href.match(/\d*(?=\.html)/), t.href.match(/[a-zA-Z0-9]*(?=\/+res)/), false, [highlight, e]);

              } else {
                loadFullThread(thread.id.split("_")[1], board, false);

              }
            }
          }
        }
      }
      highlight(e);
    }
  });

  document.addEventListener("mousemove", e => {
    if (document.querySelector("#sharty-preview")) {
      adjustHoverPos(e.x, e.y);
    }
  });

  document.addEventListener("mouseout", e => {
    let t = e.target;
    if (t.matches(".body a[onclick^='highlightReply']:not(.dead), .mentioned a, .body a[href^='/'][href*='/thread/']")) {
      if (hover = document.querySelector("#sharty-preview")) {
        hover.remove();
      }
      document.querySelectorAll(".highlighted:not(.click-highlight)").forEach(e => e.classList.remove("highlighted"));
    }
  });

  document.addEventListener("change", e => {
    let t = e.target;
    if (t.classList.contains("delete")) {
      t.closest(".post").classList.toggle("show-controls");
    }
  });

  window.addEventListener("hashchange", () => {
    let hash = window.location.hash;
    if (hash.startsWith("#p")) {
      loadIndex(parseInt(hash.substr(2)) - 1, true);
    } else if (hash == "#index") {
      loadIndex(0, true);
    } else if (hash == "#catalog") {
      loadCatalog(true);
    }
  });

  document.head.insertAdjacentHTML("beforeend", `<style>

  .catty-thread {
    display: inline-block;
    margin: 0px;
  }

  .catty-thread .thread {
    margin: 2px;
    overflow-y: hidden;
    width: auto;
  }

  .catty-thread .thread.expanded {
    overflow-y: auto;
    width: 100%;
  }

  .sf-hidden {
    display: none;
  }

  .sf-catty center img,
  .sf-catty center hr {
    display: none;
  }

  form[name=post] {
    margin: 0px;
  }

  .blotter[hidden] + hr {
    display: none;
  }

  #dyn-content.theme-catalog {
    text-align: center;
  }

  #show-post-form {
    user-select: none;
    text-align: center;
    display: inline-block;
    margin: auto;
  }

  #show-post-form.hiding::before {
    content: "[Show "
  }

  #show-post-form::before {
    content: "[Hide "
  }

  .nowrap {
    clear: both;
  }

  .multifile .unimportant {
    display: inherit;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .thread > .files .multifile:first-of-type:not(.expanded) {
    margin-left: -20px;
  }

  .loop-option {
    white-space: nowrap;
    margin-right: 5px;
    cursor: pointer;
  }

  .selected-lo {
    font-weight: bold
  }

  .full-image,
  .full-video,
  .expanded .post-image {
    display: none;
  }

  .post-image,
  .expanded .full-image,
  .expanded .full-video {
    display: inline;
  }

  .loading .post-image {
    opacity: 0.4;
  }

  .full-video {
    position: static;
    pointer-events: inherit;
    max-width: 100%;
  }

  .collapse-video {
    float: left;
  }

  .sf-index #top-bar > *:not(form):not(.reload-button) {
    display: none !important;
  }

  body:not(.sf-catty):not(.sf-index) #top-bar,
  body:not(.sf-catty):not(.sf-index) #dyn-content + div.pages.page-selector,
  body:not(.sf-catty):not(.sf-index) #dyn-content + div.pages.page-selector  + hr,
  .pages.page-selector a[href*="catalog.html"],
  .subtitle a[href*="catalog.html"] {
    display: none;
  }

  .page-selector a::before,
  .reload-button::before {
    content: "[";
  }
  .page-selector a::after,
  .reload-button::after {
    content: "]";
  }

  div.pages.page-selector {
    display: block;
    text-align: center;
    margin: auto;
    background: unset;
    border: none;
    padding: 0px;
  }

  .page-selector a {
    margin: 3px;
    text-decoration: underline;
  }

  .thread-hidden > *:not(.hide-toggle):not(hr):not(.op):not(.intro),
  .thread-hidden .op > *:not(.intro),
  .thread-hidden input,
  .thread-hidden .post.omitted-post {
    display: none !important;
  }

  .hide-toggle::after {
    content: "[–]";
  }

  .thread-hidden .hide-toggle::after {
    content: "[+]";
  }

  .image-hidden img {
    opacity: 0.1;
    background: grey;
  }

  .image-hidden .post-image {
    border: 1px solid #000;
  }

  .hide-image-link::after {
    content: "hide";
  }

  .image-hidden .hide-image-link::after {
    content: "show";
  }

  .Mod .name {
    color: purple !important;
  }

  .Mod .name::after {
    content: " ## Mod";
    font-weight: normal;
  }

  .Admin .name {
    color: red !important;
  }

  .Admin .name::after {
    content: " ## Admin";
  }

  .catty-thread.hidden,
  .showing-hidden .catty-thread:not(.hidden) {
    display: none;
  }

  .showing-hidden .catty-thread.hidden {
    display: inline-block;
  }

  .post.reply .body {
    clear: both;
  }

  .post.omitted-post,
  .thread:not(.expand-omitted) .post.omitted-post + br,
  .expand-omitted .omitted span {
    display: none !important;
  }

  #sharty-preview,
  #sharty-preview * {
    pointer-events: none;
  }

  .expand-omitted .post.omitted-post,
  #sharty-preview .post.omitted-post,
  #sharty-preview .thread .post {
    display: inline-block !important;
  }

  #sharty-preview .omitted {
    display: none;
  }

  #sharty-preview .intro {
    clear: both !important;
  }

  .omitted a::after {
    content: "[Click to Expand]"
  }

  .loading-omitted .omitted a::after {
    content: "[Loading...]"
  }

  .expand-omitted .omitted a::after {
    content: "[Hide Expanded Posts]"
  }

  .post-actions {
    display: none;
  }

  .show-controls .post-actions {
    display: block;
  }

  #external-threads {
    position: absolute;
    left: -99999px;
    top: -99999px;
  }

  #hidden-threads-toggle::before {
    content: "[Show Hidden]";
  }

  .showing-hidden #hidden-threads-toggle::before {
    content: "[Hide Hidden]";
  }

  form[name=post] > iframe[src*=kaptcha] {
    display: none;
  }

  header > * {
    text-align: center;
    width: 100%;
  }
  </style>`);

  let fixThumbnail = document.createElement("script");

  fixThumbnail.type = "text/javascript";
  fixThumbnail.innerHTML = `

    function fixThumbnail(image) {
      fetch(image.src.replace(/\.[a-zA-Z0-9]*$/, ".png"), {method: "HEAD"}).then(response => {
        if (response.status == 404) {
          fetch(image.parentNode.getAttribute("file-source"), {method: "HEAD"}).then(response => {
            if (response.status == 404) {
              image.src = "${domain}/static/deleted.png"
            } else {
              image.src = "${domain}/static/spoiler.png"
            }
          })
        } else {
          image.src = image.src.replace(/\.[a-zA-Z0-9]*$/, ".png");
        }
      })
    }
  `;
  document.getElementsByTagName("head")[0].appendChild(fixThumbnail);
}