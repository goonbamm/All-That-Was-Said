const quoteGrid = document.querySelector("#quote-grid");
const quoteCanvas = document.querySelector("#quote-canvas");
const quoteTemplate = document.querySelector("#quote-card-template");
const searchInput = document.querySelector("#search-input");
const tagFilters = document.querySelector("#tag-filters");
const quoteCount = document.querySelector("#quote-count");
const tagCount = document.querySelector("#tag-count");
const heroQuote = document.querySelector("#hero-quote");
const heroOriginal = document.querySelector("#hero-original");
const heroSource = document.querySelector("#hero-source");
const randomButton = document.querySelector("#random-button");

const state = {
  quotes: [],
  search: "",
  activeTag: "all",
  activeQuoteId: null,
  canvasAvailable: true,
};

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const MOOD_BANDS = ["calm", "reflective", "hopeful", "fierce"];

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function buildMeta(quote) {
  const details = [quote.source];
  if (quote.section) {
    details.push(quote.section);
  }
  return details.join(" · ");
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
    const matchesTag = state.activeTag === "all" || quote.tags.includes(state.activeTag);

    const haystack = normalizeText(
      [
        quote.text,
        quote.original || "",
        quote.source,
        quote.section || "",
        quote.mood || "",
        quote.tags.join(" "),
      ].join(" ")
    );
    const matchesSearch = search === "" || haystack.includes(search);

    return matchesTag && matchesSearch;
  });
}

function renderHero(quote) {
  if (!quote) {
    heroQuote.textContent = "명언을 추가하면 이 자리에서 오늘의 문장을 보여줍니다.";
    heroOriginal.textContent = "Original text appears here.";
    heroSource.textContent = "data/quotes.json";
    return;
  }

  heroQuote.textContent = quote.text;
  heroOriginal.textContent = quote.original || "";
  heroSource.textContent = `${buildMeta(quote)} · mood ${quote.mood}`;
}

function renderTagFilters(quotes) {
  const uniqueTags = [...new Set(quotes.flatMap((quote) => quote.tags))].sort((a, b) =>
    a.localeCompare(b, "ko")
  );

  tagCount.textContent = `${uniqueTags.length}`;
  tagFilters.innerHTML = "";

  const tagEntries = [
    { key: "all", label: "전체" },
    ...uniqueTags.map((tag) => ({ key: tag, label: tag })),
  ];

  tagEntries.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter";
    button.textContent = tag.label;

    if (state.activeTag === tag.key) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => {
      state.activeTag = tag.key;
      render();
    });

    tagFilters.appendChild(button);
  });
}

async function copyQuote(quote) {
  const payload = [quote.text, quote.original || "", `- ${buildMeta(quote)}`].filter(Boolean).join("\n");

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

function setActiveQuote(quote, options = {}) {
  state.activeQuoteId = quote.id;
  renderHero(quote);

  const card = document.querySelector(`[data-quote-id="${quote.id}"]`);
  if (card && options.scrollToCard) {
    card.scrollIntoView({
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
      block: "center",
    });
  }

  quoteGrid.querySelectorAll(".quote-card.is-active").forEach((element) => {
    element.classList.remove("is-active");
  });

  if (card) {
    card.classList.add("is-active");
  }

  quoteCanvas.querySelectorAll(".constellation-node.is-active").forEach((node) => {
    node.classList.remove("is-active");
    node.setAttribute("aria-current", "false");
  });

  const node = quoteCanvas.querySelector(`[data-quote-id="${quote.id}"]`);
  if (node) {
    node.classList.add("is-active");
    node.setAttribute("aria-current", "true");
  }
}

function renderList(quotes) {
  quoteGrid.innerHTML = "";
  quoteCount.textContent = `${quotes.length}`;

  if (quotes.length === 0) {
    quoteGrid.appendChild(createEmptyState("조건에 맞는 문장이 없습니다. 검색어를 바꾸거나 태그를 초기화해 보세요."));
    return;
  }

  quotes.forEach((quote, index) => {
    const fragment = quoteTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".quote-card");
    const quoteIndex = fragment.querySelector(".quote-index");
    const quoteText = fragment.querySelector(".quote-text");
    const quoteOriginal = fragment.querySelector(".quote-original");
    const quoteMeta = fragment.querySelector(".quote-meta");
    const copyButton = fragment.querySelector(".copy-button");
    const quoteTags = fragment.querySelector(".quote-tags");

    quoteIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${quote.id}`;
    quoteText.textContent = quote.text;
    quoteOriginal.textContent = quote.original || "";
    quoteMeta.textContent = `${buildMeta(quote)} · mood ${quote.mood}`;

    copyButton.addEventListener("click", async () => {
      await copyQuote(quote);
      copyButton.textContent = "복사됨";
      window.setTimeout(() => {
        copyButton.textContent = "복사";
      }, 1200);
    });

    quote.tags.forEach((tag) => {
      const item = document.createElement("span");
      item.textContent = `#${tag}`;
      quoteTags.appendChild(item);
    });

    article.dataset.quoteId = quote.id;
    quoteGrid.appendChild(fragment);
  });
}

function hashString(value) {
  return [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
}

function getConstellationPosition(quote, index, total) {
  const moodIndex = Math.max(0, MOOD_BANDS.indexOf(quote.mood));
  const moodBandHeight = 100 / MOOD_BANDS.length;
  const yBase = moodBandHeight * moodIndex + moodBandHeight / 2;
  const yJitter = ((hashString(`${quote.id}-y`) % 17) - 8) * 0.75;
  const visibleQuotes = Math.max(1, total);
  const xByIndex = ((index + 1) / (visibleQuotes + 1)) * 100;
  const xByTag = hashString(quote.tags[0] || quote.id) % 31;
  const x = Math.min(94, Math.max(7, xByIndex * 0.76 + xByTag * 0.82));

  return {
    x,
    y: Math.min(95, Math.max(5, yBase + yJitter)),
  };
}

function renderConstellation(quotes) {
  quoteCanvas.innerHTML = "";

  if (!state.canvasAvailable) {
    return;
  }

  if (quotes.length === 0) {
    quoteCanvas.appendChild(createEmptyState("별자리 뷰에 표시할 문장이 없습니다."));
    return;
  }

  const linesLayer = document.createElement("div");
  linesLayer.className = "constellation-lines";
  quoteCanvas.appendChild(linesLayer);

  quotes.forEach((quote, index) => {
    const node = document.createElement("button");
    const { x, y } = getConstellationPosition(quote, index, quotes.length);

    node.type = "button";
    node.className = "constellation-node";
    node.dataset.quoteId = quote.id;
    node.dataset.mood = quote.mood;
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.setAttribute("aria-label", `${quote.id} · ${quote.mood} · ${quote.text.slice(0, 28)}...`);
    node.setAttribute("aria-current", "false");

    node.addEventListener("click", () => {
      setActiveQuote(quote, { scrollToCard: true });
    });

    quoteCanvas.appendChild(node);
  });
}

function render() {
  const filteredQuotes = filterQuotes();

  renderTagFilters(state.quotes);
  renderList(filteredQuotes);

  try {
    renderConstellation(filteredQuotes);
  } catch (error) {
    console.error("Constellation view failed", error);
    state.canvasAvailable = false;
    quoteCanvas.innerHTML = "";
  }

  const heroTarget =
    filteredQuotes.find((quote) => quote.id === state.activeQuoteId) ||
    pickDailyQuote(filteredQuotes) ||
    pickDailyQuote(state.quotes);

  renderHero(heroTarget);

  if (heroTarget) {
    setActiveQuote(heroTarget, { scrollToCard: false });
  }
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  randomButton.addEventListener("click", () => {
    const visibleQuotes = filterQuotes();

    if (visibleQuotes.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * visibleQuotes.length);
    const randomQuote = visibleQuotes[randomIndex];
    setActiveQuote(randomQuote, { scrollToCard: true });
  });
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
