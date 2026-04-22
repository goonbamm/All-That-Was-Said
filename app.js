const quoteGrid = document.querySelector("#quote-grid");
const quoteTemplate = document.querySelector("#quote-card-template");
const searchInput = document.querySelector("#search-input");
const tagFilters = document.querySelector("#tag-filters");
const quoteCount = document.querySelector("#quote-count");
const tagCount = document.querySelector("#tag-count");
const heroQuote = document.querySelector("#hero-quote");
const heroSource = document.querySelector("#hero-source");
const randomButton = document.querySelector("#random-button");

const state = {
  quotes: [],
  search: "",
  activeTag: "all",
};

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
    const matchesTag =
      state.activeTag === "all" || quote.tags.includes(state.activeTag);

    const haystack = normalizeText(
      [quote.text, quote.source, quote.section || "", quote.tags.join(" ")].join(" ")
    );
    const matchesSearch = search === "" || haystack.includes(search);

    return matchesTag && matchesSearch;
  });
}

function renderHero(quote) {
  if (!quote) {
    heroQuote.textContent = "명언을 추가하면 이 자리에서 오늘의 문장을 보여줍니다.";
    heroSource.textContent = "data/quotes.json";
    return;
  }

  heroQuote.textContent = quote.text;
  heroSource.textContent = buildMeta(quote);
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
  const payload = `${quote.text}\n- ${buildMeta(quote)}`;

  try {
    await navigator.clipboard.writeText(payload);
  } catch (error) {
    console.error("Failed to copy quote", error);
  }
}

function renderQuotes(quotes) {
  quoteGrid.innerHTML = "";
  quoteCount.textContent = `${quotes.length}`;

  if (quotes.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "조건에 맞는 문장이 없습니다. 검색어를 바꾸거나 태그를 초기화해 보세요.";
    quoteGrid.appendChild(emptyState);
    return;
  }

  quotes.forEach((quote, index) => {
    const fragment = quoteTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".quote-card");
    const quoteIndex = fragment.querySelector(".quote-index");
    const quoteText = fragment.querySelector(".quote-text");
    const quoteMeta = fragment.querySelector(".quote-meta");
    const copyButton = fragment.querySelector(".copy-button");
    const quoteTags = fragment.querySelector(".quote-tags");

    quoteIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${quote.id}`;
    quoteText.textContent = quote.text;
    quoteMeta.textContent = buildMeta(quote);

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

function render() {
  renderTagFilters(state.quotes);
  renderHero(pickDailyQuote(state.quotes));
  renderQuotes(filterQuotes());
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  randomButton.addEventListener("click", () => {
    if (state.quotes.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * state.quotes.length);
    const randomQuote = state.quotes[randomIndex];
    renderHero(randomQuote);

    const target = document.querySelector(`[data-quote-id="${randomQuote.id}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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
