const quoteGrid = document.querySelector("#quote-grid");
const quoteCanvas = document.querySelector("#quote-canvas");
const quoteTemplate = document.querySelector("#quote-card-template");
const searchInput = document.querySelector("#search-input");
const quoteCount = document.querySelector("#quote-count");
const heroQuote = document.querySelector("#hero-quote");
const heroSource = document.querySelector("#hero-source");
const randomButton = document.querySelector("#random-button");
const focusCard = document.querySelector("#focus-card");
const statusMessage = document.querySelector("#status-message");

const state = {
  quotes: [],
  search: "",
  activeQuoteId: null,
  canvasAvailable: true,
  autoAdvancePaused: false,
  lastTransitionOrigin: "initial",
};

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = window.matchMedia("(max-width: 720px)");
const AUTO_ADVANCE_DELAY = 9000;
const AUTO_ADVANCE_PAUSE_MS = 20000;
let statusTimeoutId = null;
let autoAdvanceTimeoutId = null;
let autoAdvanceResumeTimeoutId = null;

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function buildMeta(quote) {
  const details = [quote.author_name, quote.source];
  if (quote.section) {
    details.push(quote.section);
  }
  return details.join(" · ");
}

function buildSourceLine(quote) {
  return buildMeta(quote);
}

function buildAuthorLine(author) {
  return `— ${author}`;
}

function applyQuoteClamp(quoteText, toggleButton) {
  quoteText.classList.remove("is-clamped", "is-expanded");
  toggleButton.hidden = true;
  toggleButton.textContent = "펼치기";
  toggleButton.setAttribute("aria-expanded", "false");

  if (!mobileQuery.matches) {
    return;
  }

  quoteText.classList.add("is-clamped");
  const hasOverflow = quoteText.scrollHeight > quoteText.clientHeight + 1;

  if (hasOverflow) {
    toggleButton.hidden = false;
  } else {
    quoteText.classList.remove("is-clamped");
  }
}

function setStatus(message) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.classList.add("is-visible");

  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
  }

  statusTimeoutId = window.setTimeout(() => {
    statusMessage.classList.remove("is-visible");
    statusMessage.textContent = "";
  }, 1800);
}

function pickDailyQuote(quotes) {
  if (quotes.length === 0) {
    return null;
  }

  const daySeed = Math.floor(Date.now() / 86400000);
  return quotes[daySeed % quotes.length];
}

function filterQuotes() {
  const search = normalizeText(state.search);

  return state.quotes.filter((quote) => {
    const haystack = normalizeText(
      [
        quote.quote,
        quote.author_name,
        quote.source,
        quote.section || "",
        quote.tags.join(" "),
      ].join(" ")
    );

    return search === "" || haystack.includes(search);
  });
}

function renderHero(quote) {
  if (!quote) {
    heroQuote.textContent = "문장을 추가하면 이곳에 오늘의 문장이 나타납니다.";
    heroSource.textContent = "출처 정보가 여기에 표시됩니다.";
    return;
  }

  heroQuote.textContent = quote.quote;
  heroSource.textContent = buildSourceLine(quote);
}

async function copyQuote(quote) {
  const payload = [quote.quote, `- ${buildMeta(quote)}`].filter(Boolean).join("\n");

  try {
    await navigator.clipboard.writeText(payload);
  } catch (error) {
    console.error("Failed to copy quote", error);
  }
}

function createEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function clearAutoAdvanceTimeout() {
  if (autoAdvanceTimeoutId) {
    clearTimeout(autoAdvanceTimeoutId);
    autoAdvanceTimeoutId = null;
  }
}

function clearAutoAdvanceResumeTimeout() {
  if (autoAdvanceResumeTimeoutId) {
    clearTimeout(autoAdvanceResumeTimeoutId);
    autoAdvanceResumeTimeoutId = null;
  }
}

function getNextQuote(currentQuoteId, quotes) {
  if (quotes.length === 0) {
    return null;
  }

  const currentIndex = quotes.findIndex((quote) => quote.id === currentQuoteId);
  if (currentIndex === -1) {
    return quotes[0];
  }

  return quotes[(currentIndex + 1) % quotes.length];
}

function pauseAutoAdvance(duration = AUTO_ADVANCE_PAUSE_MS) {
  state.autoAdvancePaused = true;
  clearAutoAdvanceTimeout();
  clearAutoAdvanceResumeTimeout();

  autoAdvanceResumeTimeoutId = window.setTimeout(() => {
    state.autoAdvancePaused = false;
    render();
  }, duration);
}

function scheduleAutoAdvance(quotes) {
  clearAutoAdvanceTimeout();

  if (reducedMotionQuery.matches || state.autoAdvancePaused || quotes.length < 2) {
    return;
  }

  autoAdvanceTimeoutId = window.setTimeout(() => {
    const nextQuote = getNextQuote(state.activeQuoteId, quotes);
    if (!nextQuote) {
      return;
    }

    setActiveQuote(nextQuote, { origin: "auto" });
  }, AUTO_ADVANCE_DELAY);
}

function tokenizeQuoteText(text) {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function buildRelationLabel(target, candidate, sharedTags) {
  if (target.author_name === candidate.author_name) {
    return "같은 저자";
  }
  if (target.source === candidate.source) {
    return "같은 책";
  }
  if (sharedTags.length > 0) {
    return `태그 ${sharedTags[0]}`;
  }
  return "같이 읽기";
}

function getRelatedQuotes(target, quotes, limit) {
  if (!target) {
    return [];
  }

  const targetTokens = new Set(tokenizeQuoteText(target.quote));

  return quotes
    .filter((quote) => quote.id !== target.id)
    .map((quote) => {
      const sharedTags = quote.tags.filter((tag) => target.tags.includes(tag));
      const candidateTokens = tokenizeQuoteText(quote.quote);
      const tokenOverlap = candidateTokens.filter((token) => targetTokens.has(token)).length;

      let score = sharedTags.length * 5;

      if (quote.author_name === target.author_name) {
        score += 6;
      }
      if (quote.source === target.source) {
        score += 4;
      }
      if (quote.section && target.section && quote.section === target.section) {
        score += 2;
      }

      score += Math.min(tokenOverlap, 3);

      return {
        quote,
        relation: buildRelationLabel(target, quote, sharedTags),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.quote.id.localeCompare(right.quote.id, "en"))
    .slice(0, limit);
}

function createMapCard(quote, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "constellation-card";
  if (options.variant) {
    button.classList.add(`is-${options.variant}`);
  }
  if (options.isActive) {
    button.classList.add("is-active");
    button.setAttribute("aria-current", "true");
  } else {
    button.setAttribute("aria-current", "false");
  }

  button.dataset.quoteId = quote.id;
  button.setAttribute("aria-label", `${options.relation ? `${options.relation} · ` : ""}${quote.quote.slice(0, 40)}`);

  const relation = options.relation
    ? `<span class="constellation-card-relation">${options.relation}</span>`
    : "";

  button.innerHTML = `
    <span class="constellation-card-shell">
      ${relation}
      <span class="constellation-card-quote">${quote.quote}</span>
      <span class="constellation-card-meta">${buildMeta(quote)}</span>
    </span>
  `;

  button.addEventListener("click", () => {
    setActiveQuote(quote, { scrollToCard: true });
  });

  return button;
}

function createMapNode(item, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "constellation-node";
  button.dataset.quoteId = item.quote.id;
  button.style.setProperty("--node-delay", `${(index * 140).toFixed(0)}ms`);
  button.setAttribute("aria-label", `${item.relation} · ${item.quote.quote.slice(0, 32)}`);

  button.innerHTML = `
    <span class="constellation-node-core"></span>
    <span class="constellation-node-label">
      <span class="constellation-node-relation">${item.relation}</span>
      <span class="constellation-node-title">${item.quote.quote}</span>
      <span class="constellation-node-meta">${buildMeta(item.quote)}</span>
    </span>
  `;

  button.addEventListener("click", () => {
    setActiveQuote(item.quote, { scrollToCard: true });
  });

  return button;
}

function getDesktopOrbitPosition(index, total) {
  const angles = [-88, -34, 20, 68, 122, 182, 235];
  const radii = [31, 38, 34, 39, 35, 38, 31];
  const angle = ((angles[index] ?? (index * 52 - 90)) * Math.PI) / 180;
  const radius = radii[index] ?? 36;

  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * (total <= 4 ? radius * 0.74 : radius * 0.82),
  };
}

function drawDesktopConnections(svg, nodes) {
  nodes.forEach((node, index) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const controlY = node.y < 50 ? 42 : 58;
    line.setAttribute(
      "d",
      `M 50 50 Q ${(50 + node.x) / 2} ${controlY} ${node.x} ${node.y}`
    );
    line.classList.add("constellation-link");
    line.style.setProperty("--line-delay", `${index * 120}ms`);
    svg.appendChild(line);
  });
}

function renderDesktopMap(target, relatedQuotes) {
  const shell = document.createElement("div");
  shell.className = "constellation-map constellation-map-desktop";

  const linesLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  linesLayer.classList.add("constellation-lines");
  linesLayer.setAttribute("viewBox", "0 0 100 100");
  linesLayer.setAttribute("preserveAspectRatio", "none");
  linesLayer.setAttribute("aria-hidden", "true");
  shell.appendChild(linesLayer);

  const heading = document.createElement("div");
  heading.className = "constellation-heading";
  heading.innerHTML = `
    <p class="constellation-eyebrow">Sentence Atlas</p>
    <h2 class="constellation-title">문장 항해도</h2>
    <p class="constellation-copy">지금 선택한 문장을 중심으로, 같은 저자와 태그, 같은 책에서 이어지는 문장만 궤도로 묶었습니다.</p>
  `;
  shell.appendChild(heading);

  const orbitRing = document.createElement("div");
  orbitRing.className = "constellation-orbit-ring";
  shell.appendChild(orbitRing);

  const centerCard = createMapCard(target, { variant: "focus", isActive: true });
  centerCard.classList.add("constellation-focus-card");
  shell.appendChild(centerCard);

  const nodes = relatedQuotes.map((item, index) => ({
    item,
    ...getDesktopOrbitPosition(index, relatedQuotes.length),
  }));

  drawDesktopConnections(linesLayer, nodes);

  nodes.forEach((node, index) => {
    const marker = createMapNode(node.item, index);
    marker.style.left = `${node.x}%`;
    marker.style.top = `${node.y}%`;
    shell.appendChild(marker);
  });

  return shell;
}

function renderMobileMap(target, relatedQuotes) {
  const shell = document.createElement("div");
  shell.className = "constellation-map constellation-map-mobile";

  const heading = document.createElement("div");
  heading.className = "constellation-heading";
  heading.innerHTML = `
    <p class="constellation-eyebrow">Sentence Atlas</p>
    <h2 class="constellation-title">문장 항해도</h2>
    <p class="constellation-copy">모바일에서는 중심 문장에서 이어지는 문장만 아래로 따라가며 읽도록 단순하게 정리했습니다.</p>
  `;
  shell.appendChild(heading);

  const trail = document.createElement("div");
  trail.className = "constellation-trail";
  shell.appendChild(trail);

  const focusCard = createMapCard(target, { variant: "focus", isActive: true });
  focusCard.classList.add("constellation-trail-focus");
  trail.appendChild(focusCard);

  relatedQuotes.forEach((item, index) => {
    const stop = document.createElement("div");
    stop.className = "trail-stop";
    stop.style.setProperty("--trail-delay", `${(index * 120).toFixed(0)}ms`);

    const marker = document.createElement("span");
    marker.className = "trail-marker";
    marker.setAttribute("aria-hidden", "true");

    const branch = createMapCard(item.quote, {
      variant: "branch",
      relation: item.relation,
      isActive: state.activeQuoteId === item.quote.id,
    });
    branch.classList.add("constellation-trail-card");

    stop.append(marker, branch);
    trail.appendChild(stop);
  });

  return shell;
}

function renderConstellation(quotes, target) {
  quoteCanvas.innerHTML = "";

  if (!state.canvasAvailable) {
    return;
  }

  if (quotes.length === 0 || !target) {
    quoteCanvas.appendChild(createEmptyState("항해도에 표시할 문장이 없습니다."));
    return;
  }

  const relatedQuotes = getRelatedQuotes(target, quotes, mobileQuery.matches ? 4 : 6);
  if (relatedQuotes.length === 0) {
    quoteCanvas.appendChild(createEmptyState("이어 읽을 만한 문장이 아직 충분하지 않습니다."));
    return;
  }

  quoteCanvas.dataset.layout = mobileQuery.matches ? "mobile" : "desktop";
  quoteCanvas.dataset.transition = state.lastTransitionOrigin;
  quoteCanvas.appendChild(
    mobileQuery.matches ? renderMobileMap(target, relatedQuotes) : renderDesktopMap(target, relatedQuotes)
  );
}

function syncActiveListState(activeQuoteId) {
  quoteGrid.querySelectorAll(".quote-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.quoteId === activeQuoteId);
  });

  const hasActive = Boolean(activeQuoteId && quoteGrid.querySelector(`[data-quote-id="${activeQuoteId}"]`));
  quoteGrid.classList.toggle("has-active", hasActive);
}

function renderList(quotes) {
  quoteGrid.innerHTML = "";
  quoteCount.textContent = `${quotes.length}`;

  if (quotes.length === 0) {
    quoteGrid.classList.remove("has-active");
    quoteGrid.appendChild(createEmptyState("조건에 맞는 문장이 없습니다. 검색어를 바꿔 보세요."));
    return;
  }

  quotes.forEach((quote, index) => {
    const fragment = quoteTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".quote-card");
    const quoteIndex = fragment.querySelector(".quote-index");
    const quoteText = fragment.querySelector(".quote-text");
    const quoteAuthor = fragment.querySelector(".quote-author");
    const quoteSource = fragment.querySelector(".quote-source");
    const expandToggle = fragment.querySelector(".quote-expand-toggle");
    const copyButton = fragment.querySelector(".copy-button");

    quoteIndex.textContent = `No. ${String(index + 1).padStart(2, "0")}`;
    quoteText.textContent = quote.quote;
    quoteAuthor.textContent = buildAuthorLine(quote.author_name);
    quoteSource.textContent = quote.source;

    expandToggle.setAttribute("aria-label", "문장 전체 보기");
    expandToggle.addEventListener("click", () => {
      const isExpanded = quoteText.classList.contains("is-expanded");
      quoteText.classList.toggle("is-expanded", !isExpanded);
      quoteText.classList.toggle("is-clamped", isExpanded);
      expandToggle.textContent = isExpanded ? "펼치기" : "접기";
      expandToggle.setAttribute("aria-expanded", String(!isExpanded));
    });

    copyButton.addEventListener("click", async () => {
      await copyQuote(quote);
      copyButton.textContent = "복사됨";
      setStatus("문장을 복사했습니다.");
      window.setTimeout(() => {
        copyButton.textContent = "복사";
      }, 1200);
    });

    article.dataset.quoteId = quote.id;
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    article.setAttribute("aria-label", `${quote.quote.slice(0, 24)} 문장 보기`);

    article.addEventListener("click", (event) => {
      if (event.target.closest(".copy-button") || event.target.closest(".quote-expand-toggle")) {
        return;
      }
      setActiveQuote(quote);
    });

    article.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      setActiveQuote(quote);
    });

    quoteGrid.appendChild(fragment);
    requestAnimationFrame(() => applyQuoteClamp(quoteText, expandToggle));
  });
}

function setActiveQuote(quote, options = {}) {
  const origin = options.origin ?? "manual";

  if (origin !== "auto") {
    pauseAutoAdvance();
  }

  state.activeQuoteId = quote.id;
  state.lastTransitionOrigin = origin;
  render();

  const card = document.querySelector(`[data-quote-id="${quote.id}"].quote-card`);
  if (card && options.scrollToCard) {
    card.scrollIntoView({
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
      block: "center",
    });
  }
}

function render() {
  const filteredQuotes = filterQuotes();
  const heroTarget =
    filteredQuotes.find((quote) => quote.id === state.activeQuoteId) ||
    pickDailyQuote(filteredQuotes) ||
    pickDailyQuote(state.quotes);

  if (heroTarget) {
    state.activeQuoteId = heroTarget.id;
  }

  renderList(filteredQuotes);
  renderHero(heroTarget);

  try {
    renderConstellation(filteredQuotes, heroTarget);
  } catch (error) {
    console.error("Constellation view failed, fallback to list", error);
    state.canvasAvailable = false;
    quoteCanvas.hidden = true;
  }

  if (state.canvasAvailable) {
    quoteCanvas.hidden = false;
  }

  quoteGrid.hidden = false;
  syncActiveListState(state.activeQuoteId);
  scheduleAutoAdvance(filteredQuotes);
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    pauseAutoAdvance();
    render();
  });

  randomButton.addEventListener("click", () => {
    const visibleQuotes = filterQuotes();

    if (visibleQuotes.length === 0) {
      setStatus("현재 조건에서 고를 수 있는 문장이 없습니다.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * visibleQuotes.length);
    const randomQuote = visibleQuotes[randomIndex];
    setActiveQuote(randomQuote, { scrollToCard: true });
    setStatus("추천 문장을 보여드렸어요.");
  });

  mobileQuery.addEventListener("change", () => {
    render();
  });

  reducedMotionQuery.addEventListener("change", () => {
    render();
  });

  if (focusCard) {
    focusCard.addEventListener("pointermove", (event) => {
      const rect = focusCard.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const tiltY = (x - 0.5) * 8;
      const tiltX = (0.5 - y) * 7;

      focusCard.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      focusCard.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      focusCard.style.setProperty("--pointer-x", `${(x * 100).toFixed(2)}%`);
      focusCard.style.setProperty("--pointer-y", `${(y * 100).toFixed(2)}%`);
    });

    focusCard.addEventListener("pointerleave", () => {
      focusCard.style.setProperty("--tilt-y", "0deg");
      focusCard.style.setProperty("--tilt-x", "0deg");
      focusCard.style.setProperty("--pointer-x", "50%");
      focusCard.style.setProperty("--pointer-y", "50%");
    });
  }
}

async function loadQuotes() {
  const response = await fetch("./data/quotes.json");

  if (!response.ok) {
    throw new Error(`Unable to load quotes: ${response.status}`);
  }

  const quotes = await response.json();

  return quotes.sort((left, right) => left.id.localeCompare(right.id, "en"));
}

async function init() {
  bindEvents();

  try {
    state.quotes = await loadQuotes();
    render();
  } catch (error) {
    console.error(error);
    quoteGrid.innerHTML =
      '<div class="empty-state">명언 데이터를 불러오지 못했습니다. <code>data/quotes.json</code> 형식을 확인해 주세요.</div>';
  }
}

init();
