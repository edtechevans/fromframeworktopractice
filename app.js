(function siteApp() {
  const API_URL = "https://ncrwtmhjrgsritsluipz.supabase.co/functions/v1/from-framework-to-practice-register";
  const STORAGE_KEY = "fftp_pathway_v3";

  const sessions = window.FFTP_SESSIONS || [];
  const blocks = window.FFTP_BLOCKS || [];
  const audiences = window.FFTP_AUDIENCES || [];
  const facets = window.FFTP_FACETS || [];
  const themes = window.FFTP_THEMES || [];
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const availability = new Map();

  const defaultState = {
    name: "",
    email: "",
    selections: { 1: "", 2: "", 3: "" },
    audiences: [],
    focus: [],
    confirmed: false,
    confirmedAt: null,
    mode: null
  };

  let state = loadState();
  let activeBlock = 1;
  let activeDayBlock = 1;
  let inspectedSessionId = "";
  let registrationOpen = false;
  let availabilityLoaded = false;

  const builderView = document.getElementById("builderView");
  const pathwayView = document.getElementById("pathwayView");
  const navExplore = document.getElementById("navExplore");
  const navPathway = document.getElementById("navPathway");
  const navPathwayCount = document.getElementById("navPathwayCount");
  const heroPathwayButton = document.getElementById("heroPathwayButton");
  const returningBanner = document.getElementById("returningBanner");
  const returningMessage = document.getElementById("returningMessage");
  const returningViewButton = document.getElementById("returningViewButton");
  const statusBanner = document.getElementById("statusBanner");
  const form = document.getElementById("registrationForm");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const audienceFilters = document.getElementById("audienceFilters");
  const focusFilters = document.getElementById("focusFilters");
  const clearFilters = document.getElementById("clearFilters");
  const blockTabs = document.getElementById("blockTabs");
  const blocksRoot = document.getElementById("blocks");
  const matchSummary = document.getElementById("matchSummary");
  const detailBlockLabel = document.getElementById("detailBlockLabel");
  const detailCapacity = document.getElementById("detailCapacity");
  const sessionDetail = document.getElementById("sessionDetail");
  const detailChooseButton = document.getElementById("detailChooseButton");
  const reviewSelections = document.getElementById("reviewSelections");
  const choiceCount = document.getElementById("choiceCount");
  const submitButton = document.getElementById("submitButton");
  const submitHelp = document.getElementById("submitHelp");
  const formMessage = document.getElementById("formMessage");
  const progressStrip = document.getElementById("progressStrip");
  const pathwayGreeting = document.getElementById("pathwayGreeting");
  const pathwaySavedMessage = document.getElementById("pathwaySavedMessage");
  const browseProgrammeButton = document.getElementById("browseProgrammeButton");
  const resetPreviewButton = document.getElementById("resetPreviewButton");
  const savedPathwayCards = document.getElementById("savedPathwayCards");
  const dayBlockTabs = document.getElementById("dayBlockTabs");
  const dayProgramme = document.getElementById("dayProgramme");
  const detailsCard = document.querySelector(".details-card");
  const personaliseCard = document.querySelector(".personalise-card");
  const pathwayCard = document.querySelector(".pathway-card");
  const mobileFilterToggle = document.getElementById("mobileFilterToggle");
  const filterCount = document.getElementById("filterCount");
  const filterToggleLabel = document.getElementById("filterToggleLabel");
  const mobileDock = document.getElementById("mobileDock");
  const mobileDockStatus = document.getElementById("mobileDockStatus");
  const mobileDockAction = document.getElementById("mobileDockAction");
  const mobileMedia = window.matchMedia("(max-width: 720px)");
  const dayDetailDialog = document.getElementById("dayDetailDialog");
  const dayDetailContent = document.getElementById("dayDetailContent");
  const dayDetailClose = document.getElementById("dayDetailClose");

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return JSON.parse(JSON.stringify(defaultState));

      return {
        ...JSON.parse(JSON.stringify(defaultState)),
        ...parsed,
        selections: {
          ...defaultState.selections,
          ...(parsed.selections || {})
        },
        audiences: Array.isArray(parsed.audiences) ? parsed.audiences.filter((v) => audiences.includes(v)) : [],
        focus: Array.isArray(parsed.focus)
          ? parsed.focus.filter((v) => facets.includes(v) || themes.includes(v))
          : []
      };
    } catch {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The experience still works if browser storage is unavailable.
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]
    ));
  }

  function validEmail(value) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "").trim());
  }

  function selectedCount() {
    return [1, 2, 3].filter((block) => Boolean(state.selections[block])).length;
  }

  function detailsComplete() {
    return Boolean(state.name.trim()) && validEmail(state.email);
  }

  function allChoicesComplete() {
    return selectedCount() === 3;
  }

  function abbreviateAudience(label) {
    const map = {
      "Lower Elementary": "LE",
      "Upper Elementary": "UE",
      "Lower Secondary": "LS",
      "Upper Secondary": "US"
    };
    return map[label] || label;
  }

  function capacityInfo(sessionId) {
    const data = availability.get(sessionId);
    if (!availabilityLoaded || !data) {
      return { label: "", className: "neutral", full: false, remaining: null };
    }
    if (data.full) {
      return { label: "Full", className: "full", full: true, remaining: 0 };
    }
    if (data.remaining <= 4) {
      return {
        label: `${data.remaining} ${data.remaining === 1 ? "place" : "places"} left`,
        className: "limited",
        full: false,
        remaining: data.remaining
      };
    }
    return { label: "", className: "available", full: false, remaining: data.remaining };
  }

  function filtersActive() {
    return state.audiences.length > 0 || state.focus.length > 0;
  }

  function sessionMatches(session) {
    return filtersActive() && matchScore(session) > 0;
  }

  function matchScore(session) {
    let score = 0;
    for (const audience of state.audiences) {
      if (session.audiences.includes(audience)) score += 3;
    }
    const sessionFocus = [...session.facets, ...session.themes];
    for (const focus of state.focus) {
      if (sessionFocus.includes(focus)) score += 2;
    }
    return score;
  }

  function recommendedIdsForBlock(block) {
    if (!filtersActive()) return [];
    return sessions
      .filter((session) => session.block === block)
      .map((session) => ({ id: session.id, score: matchScore(session), slot: session.slot }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.slot - b.slot)
      .slice(0, 3)
      .map((item) => item.id);
  }

  function sessionsForBlock(block) {
    const list = sessions.filter((session) => session.block === block);
    if (!filtersActive()) return list.slice().sort((a, b) => a.slot - b.slot);

    return list.slice().sort((a, b) => {
      const scoreDiff = matchScore(b) - matchScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.slot - b.slot;
    });
  }

  function tagRow(tags, className = "") {
    return tags.map((tag) => `<span class="info-tag ${className}">${escapeHtml(tag)}</span>`).join("");
  }

  function renderFilters() {
    audienceFilters.innerHTML = audiences.map((audience) => {
      const pressed = state.audiences.includes(audience);
      return `
        <button type="button" class="chip-button" data-audience="${escapeHtml(audience)}"
          aria-pressed="${pressed ? "true" : "false"}">
          ${escapeHtml(audience)}
        </button>`;
    }).join("");

    const focusOptions = [
      ...themes.map((value) => ({ value, label: value })),
      ...facets.map((value) => ({ value, label: value }))
    ];

    focusFilters.innerHTML = focusOptions.map(({ value, label }) => {
      const pressed = state.focus.includes(value);
      return `
        <button type="button" class="chip-button" data-focus="${escapeHtml(value)}"
          aria-pressed="${pressed ? "true" : "false"}">
          ${escapeHtml(label)}
        </button>`;
    }).join("");

    audienceFilters.querySelectorAll("[data-audience]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.audience;
        state.audiences = toggleInArray(state.audiences, value);
        persistState();
        renderFilters();
        renderProgramme();
      });
    });

    focusFilters.querySelectorAll("[data-focus]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.focus;
        state.focus = toggleInArray(state.focus, value);
        persistState();
        renderFilters();
        renderProgramme();
      });
    });

    const activeFilterCount = state.audiences.length + state.focus.length;
    filterCount.textContent = activeFilterCount ? String(activeFilterCount) : "";
    personaliseCard.classList.toggle("has-filters", activeFilterCount > 0);
  }

  function toggleInArray(items, value) {
    return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
  }

  function isMobile() {
    return mobileMedia.matches;
  }

  function syncResponsiveLayout() {
    detailsCard.classList.add("final-details");
    detailsCard.hidden = !allChoicesComplete() && !state.confirmed;
  }

  function updateMobileDock() {
    const show = isMobile() && !state.confirmed && !builderView.hidden;
    mobileDock.hidden = !show;
    document.body.classList.toggle("has-mobile-dock", show);
    if (!show) return;

    const count = selectedCount();
    if (count < 3) {
      const nextBlock = [1, 2, 3].find((block) => !state.selections[block]) || activeBlock;
      mobileDockStatus.textContent = `${count} of 3 workshops chosen`;
      mobileDockAction.textContent = count === 0 ? "Choose Session 1" : `Choose Session ${nextBlock}`;
      mobileDockAction.dataset.action = "block";
      mobileDockAction.dataset.block = String(nextBlock);
      return;
    }

    if (!detailsComplete()) {
      mobileDockStatus.textContent = "3 of 3 workshops chosen";
      mobileDockAction.textContent = "Add my details";
      mobileDockAction.dataset.action = "details";
      delete mobileDockAction.dataset.block;
      return;
    }

    mobileDockStatus.textContent = "Ready to confirm";
    mobileDockAction.textContent = registrationOpen ? "Review & confirm" : "Review test pathway";
    mobileDockAction.dataset.action = "review";
    delete mobileDockAction.dataset.block;
  }

  function renderBlockTabs() {
    blockTabs.innerHTML = blocks.map((block) => {
      const chosen = sessionById.get(state.selections[block.block]);
      const active = activeBlock === block.block;
      return `
        <button type="button" class="block-tab ${chosen ? "is-complete" : ""}"
          role="tab"
          data-block-tab="${block.block}"
          aria-selected="${active ? "true" : "false"}">
          <span>${escapeHtml(block.label)}</span>
          <small>${chosen ? escapeHtml(chosen.title) : "Choose one workshop"}</small>
        </button>`;
    }).join("");

    blockTabs.querySelectorAll("[data-block-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeBlock = Number(button.dataset.blockTab);
        inspectedSessionId = state.selections[activeBlock] || "";
        renderProgramme();
        updateProgress();
      });
    });
  }

  function renderProgramme() {
    renderBlockTabs();

    const blockSessions = sessionsForBlock(activeBlock);
    const recommendedIds = recommendedIdsForBlock(activeBlock);

    if (filtersActive()) {
      matchSummary.textContent = `${recommendedIds.length} best ${recommendedIds.length === 1 ? "match" : "matches"} highlighted · all workshops shown`;
    } else {
      matchSummary.textContent = "All workshops shown";
    }

    blocksRoot.innerHTML = `
      <section class="block-panel" role="tabpanel">
        <div class="block-panel-heading">
          <strong>Session ${activeBlock}</strong>
          <span>10 sessions · up to 15 participants each</span>
        </div>

        <div class="session-list">
          ${blockSessions.map((session) => renderSessionEntry(session, recommendedIds.includes(session.id))).join("")}
        </div>

        ${activeBlock < 3 ? `
          <div class="panel-footer">
            <button type="button" class="next-block" data-next-block="${activeBlock + 1}"
              ${state.selections[activeBlock] ? "" : "disabled"}>
              Continue to Session ${activeBlock + 1} →
            </button>
          </div>` : ""}
      </section>`;

    wireProgrammeEvents();

    if (!inspectedSessionId || !sessionById.has(inspectedSessionId) || sessionById.get(inspectedSessionId).block !== activeBlock) {
      inspectedSessionId = state.selections[activeBlock] || (isMobile() ? "" : blockSessions[0]?.id || "");
    }

    updateInspectedClasses();
    renderSessionDetail();
    renderReview();
    updateProgress();
  }

  function renderSessionEntry(session, recommended = false) {
    const capacity = capacityInfo(session.id);
    const chosen = state.selections[session.block] === session.id;
    const expanded = inspectedSessionId === session.id;
    const audienceMini = session.audiences.map(abbreviateAudience).join(" · ");
    const facetsMini = session.facets.slice(0, 2).join(" · ");

    return `
      <article class="session-entry ${chosen ? "is-chosen" : ""} ${recommended ? "is-match" : ""} ${capacity.full ? "is-full" : ""}"
        data-session-entry="${session.id}">
        <button type="button" class="session-inspect" data-inspect="${session.id}" aria-expanded="${expanded ? "true" : "false"}">
          <span class="session-main">
            <span class="session-title-row">
              <span class="session-title">${escapeHtml(session.title)}</span>
              ${chosen ? '<span class="chosen-badge">MY SESSION</span>' : ""}
              ${recommended && !chosen ? '<span class="match-badge">BEST MATCH</span>' : ""}
            </span>
            <span class="session-mini-tags">
              <span class="mini-tag room-mini">Room ${escapeHtml(session.room)}</span>
              <span class="mini-tag">${escapeHtml(audienceMini)}</span>
              <span class="mini-tag">${escapeHtml(facetsMini)}</span>
              <span class="mini-tag">${escapeHtml(session.format)}</span>
            </span>
          </span>
          <span class="session-end">
            ${capacity.label ? `<span class="capacity-pill ${capacity.className}">${escapeHtml(capacity.label)}</span>` : ""}
            <span class="session-chevron" aria-hidden="true">⌄</span>
          </span>
        </button>

        <div class="mobile-session-detail">
          <p class="mobile-room">Room ${escapeHtml(session.room)}</p>
          <p class="mobile-presenter">${escapeHtml(session.presenters)}</p>
          <p>${escapeHtml(session.blurb)}</p>
          <div class="tag-row">${tagRow(session.audiences)}</div>
          <div class="tag-row">${tagRow(session.facets, "facet")}</div>
          <div class="tag-row">${tagRow(session.themes, "theme")}</div>
          <button type="button" class="mobile-choose ${chosen ? "is-selected" : ""}" data-mobile-choose="${session.id}"
            ${state.confirmed || capacity.full || chosen ? "disabled" : ""}>
            ${chosen ? "Selected ✓" : capacity.full ? "Session full" : "Choose this session"}
          </button>
        </div>
      </article>`;
  }

  function wireProgrammeEvents() {
    blocksRoot.querySelectorAll("[data-inspect]").forEach((button) => {
      const id = button.dataset.inspect;
      button.addEventListener("click", () => inspectSession(id));
      button.addEventListener("mouseenter", () => inspectSession(id, false));
      button.addEventListener("focus", () => inspectSession(id, false));
    });

    blocksRoot.querySelectorAll("[data-mobile-choose]").forEach((button) => {
      button.addEventListener("click", () => selectSession(button.dataset.mobileChoose));
    });

    const nextButton = blocksRoot.querySelector("[data-next-block]");
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        activeBlock = Number(nextButton.dataset.nextBlock);
        inspectedSessionId = state.selections[activeBlock] || "";
        renderProgramme();
        document.querySelector(".programme-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function inspectSession(id, scrollOnMobile = true) {
    const entry = blocksRoot.querySelector(`[data-session-entry="${CSS.escape(id)}"]`);
    const shouldCollapse = isMobile() && inspectedSessionId === id && entry?.classList.contains("is-inspected");

    inspectedSessionId = shouldCollapse ? "" : id;
    updateInspectedClasses();
    renderSessionDetail();

    if (scrollOnMobile && isMobile() && !shouldCollapse) {
      entry?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function updateInspectedClasses() {
    blocksRoot.querySelectorAll("[data-session-entry]").forEach((entry) => {
      const expanded = entry.dataset.sessionEntry === inspectedSessionId;
      entry.classList.toggle("is-inspected", expanded);
      entry.querySelector("[data-inspect]")?.setAttribute("aria-expanded", String(expanded));
    });
  }

  function renderSessionDetail() {
    const session = sessionById.get(inspectedSessionId);

    if (!session) {
      detailBlockLabel.textContent = "Choose a session to explore";
      detailCapacity.textContent = "";
      detailCapacity.className = "capacity-pill neutral";
      detailCapacity.hidden = true;
      sessionDetail.innerHTML = `
        <h3>Explore before you choose.</h3>
        <p class="blurb-line">Select any session to see its presenter, description, audience, TLF connections, and focus tags here.</p>`;
      detailChooseButton.disabled = true;
      detailChooseButton.textContent = "Choose this session";
      detailChooseButton.classList.remove("is-selected");
      return;
    }

    const capacity = capacityInfo(session.id);
    const chosen = state.selections[session.block] === session.id;

    detailBlockLabel.textContent = `Session ${session.block} · Room ${session.room} · ${session.format}`;
    detailCapacity.textContent = capacity.label;
    detailCapacity.className = `capacity-pill ${capacity.className}`;
    detailCapacity.hidden = !capacity.label;

    sessionDetail.innerHTML = `
      <h3>${escapeHtml(session.title)}</h3>
      <p class="room-line">Room ${escapeHtml(session.room)}</p>
      <p class="presenter-line">${escapeHtml(session.presenters)}</p>
      <p class="blurb-line">${escapeHtml(session.blurb)}</p>

      <div class="tag-groups">
        <div>
          <span class="tag-group-label">For</span>
          <div class="tag-row">${tagRow(session.audiences)}</div>
        </div>
        <div>
          <span class="tag-group-label">TLF facets</span>
          <div class="tag-row">${tagRow(session.facets, "facet")}</div>
        </div>
        <div>
          <span class="tag-group-label">Focus</span>
          <div class="tag-row">${tagRow(session.themes, "theme")}</div>
        </div>
      </div>`;

    detailChooseButton.classList.toggle("is-selected", chosen);
    detailChooseButton.disabled = state.confirmed || capacity.full || chosen;
    detailChooseButton.textContent = state.confirmed
      ? chosen ? "Saved in my pathway" : "Pathway already confirmed"
      : capacity.full
        ? "Session full"
        : chosen
          ? "Selected ✓"
          : "Choose this session";
  }

  function selectSession(id) {
    if (state.confirmed) return;

    const session = sessionById.get(id);
    if (!session) return;

    const capacity = capacityInfo(id);
    if (capacity.full) return;

    state.selections[session.block] = id;
    persistState();

    inspectedSessionId = id;
    renderProgramme();
    updateChrome();
  }

  function removeSelection(block) {
    if (state.confirmed) return;
    state.selections[block] = "";
    persistState();
    renderProgramme();
    updateChrome();
  }

  function renderReview() {
    const count = selectedCount();
    choiceCount.textContent = `${count} / 3`;

    reviewSelections.innerHTML = [1, 2, 3].map((block) => {
      const session = sessionById.get(state.selections[block]);
      if (!session) {
        return `
          <div class="review-item empty">
            <span>Session ${block}</span>
            <strong>Choose a workshop</strong>
          </div>`;
      }

      return `
        <div class="review-item">
          <span>Session ${block}</span>
          <strong>${escapeHtml(session.title)}</strong>
          <small>${escapeHtml(session.presenters)} · Room ${escapeHtml(session.room)}</small>
          ${state.confirmed ? "" : `<button class="review-remove" type="button" data-remove-block="${block}" aria-label="Remove Session ${block} selection">Remove</button>`}
        </div>`;
    }).join("");

    reviewSelections.querySelectorAll("[data-remove-block]").forEach((button) => {
      button.addEventListener("click", () => removeSelection(Number(button.dataset.removeBlock)));
    });

    if (state.confirmed) {
      submitButton.disabled = true;
      submitButton.textContent = "Pathway confirmed";
      submitHelp.textContent = "Your confirmed pathway is saved on this browser.";
    } else {
      const confirmationAvailable = registrationOpen || availabilityLoaded;
      submitButton.disabled = !(detailsComplete() && allChoicesComplete() && confirmationAvailable);
      submitButton.textContent = registrationOpen
        ? "Confirm my pathway"
        : availabilityLoaded
          ? "Save test pathway"
          : "Confirmation unavailable";
      submitHelp.textContent = registrationOpen
        ? "Your name, email address and choices are used only to manage this event."
        : availabilityLoaded
          ? "Preview mode: this test pathway is saved only on this browser and is not submitted."
          : "Live capacity could not be checked, so confirmation is temporarily paused.";
    }
  }

  function updateProgress() {
    const complete = {
      1: Boolean(state.selections[1]),
      2: Boolean(state.selections[2]),
      3: Boolean(state.selections[3]),
      details: detailsComplete(),
      confirm: state.confirmed
    };

    let active = "1";
    if (complete[1]) active = "2";
    if (complete[1] && complete[2]) active = "3";
    if (complete[1] && complete[2] && complete[3]) active = "details";
    if (complete[1] && complete[2] && complete[3] && complete.details) active = "confirm";
    if (state.confirmed) active = "confirm";

    progressStrip.querySelectorAll("[data-progress]").forEach((step) => {
      const key = step.dataset.progress;
      step.classList.toggle("is-complete", Boolean(complete[key]));
      step.classList.toggle("is-active", key === active);
    });
  }

  function updateChrome() {
    const count = selectedCount();
    navPathwayCount.textContent = String(count);

    navPathway.hidden = !state.confirmed;
    heroPathwayButton.hidden = !state.confirmed;

    document.body.classList.toggle("returning-attendee", state.confirmed);

    if (state.confirmed) {
      returningBanner.hidden = true;
    } else {
      returningBanner.hidden = true;
    }

    updateProgress();
    renderReview();
    syncResponsiveLayout();
    updateMobileDock();
  }

  function showBuilder(shouldScroll = true) {
    builderView.hidden = false;
    pathwayView.hidden = true;
    navExplore.classList.add("is-active");
    navPathway.classList.remove("is-active");
    syncResponsiveLayout();
    updateMobileDock();
    if (shouldScroll) {
      document.getElementById("experience")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function showPathway(shouldScroll = true) {
    if (!state.confirmed) {
      showBuilder(shouldScroll);
      return;
    }

    renderPathwayView();
    builderView.hidden = true;
    pathwayView.hidden = false;
    navExplore.classList.remove("is-active");
    navPathway.classList.add("is-active");
    mobileDock.hidden = true;
    if (shouldScroll) {
      document.getElementById("experience")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderPathwayView() {
    pathwayGreeting.textContent = state.name
      ? `${state.name.split(/\s+/)[0]}'s learning pathway`
      : "Your learning pathway";

    pathwaySavedMessage.textContent = state.mode === "preview"
      ? "This is a test pathway saved only on this browser. Use it to review the attendee experience, then reset when you want to test again."
      : "Your pathway is saved on this browser. Come back here on the day to see your sessions and quickly browse what else is happening.";

    resetPreviewButton.hidden = state.mode !== "preview";

    savedPathwayCards.innerHTML = [1, 2, 3].map((block) => {
      const session = sessionById.get(state.selections[block]);
      if (!session) return "";

      return `
        <article class="saved-card">
          <span class="saved-block">Session ${block}</span>
          <h3>${escapeHtml(session.title)}</h3>
          <span class="saved-presenter">${escapeHtml(session.presenters)}</span>
          <span class="saved-room">Room ${escapeHtml(session.room)}</span>
          <p>${escapeHtml(session.blurb)}</p>
          <div class="tag-row">${tagRow(session.facets, "facet")}</div>
          <div class="tag-row">${tagRow(session.audiences)}</div>
        </article>`;
    }).join("");

    renderDayTabs();
    renderDayProgramme();
  }

  function renderDayTabs() {
    dayBlockTabs.innerHTML = blocks.map((block) => {
      const active = activeDayBlock === block.block;
      return `
        <button type="button" class="block-tab ${state.selections[block.block] ? "is-complete" : ""}"
          data-day-block="${block.block}" role="tab" aria-selected="${active ? "true" : "false"}">
          <span>${escapeHtml(block.label)}</span>
          <small>${state.selections[block.block] ? "Your choice highlighted" : "Browse sessions"}</small>
        </button>`;
    }).join("");

    dayBlockTabs.querySelectorAll("[data-day-block]").forEach((button) => {
      button.addEventListener("click", () => {
        activeDayBlock = Number(button.dataset.dayBlock);
        renderDayTabs();
        renderDayProgramme();
      });
    });
  }

  function renderDayProgramme() {
    const list = sessions.filter((session) => session.block === activeDayBlock).sort((a, b) => a.slot - b.slot);

    dayProgramme.innerHTML = `
      <div class="day-session-list">
        ${list.map((session) => {
          const mine = state.selections[activeDayBlock] === session.id;
          const capacity = capacityInfo(session.id);
          const audienceMini = session.audiences.map(abbreviateAudience).join(" · ");

          return `
            <button type="button" class="day-session ${mine ? "is-mine" : ""}" data-day-session="${session.id}">
              <span>
                <strong>${escapeHtml(session.title)}</strong>
                <small>Room ${escapeHtml(session.room)} · ${escapeHtml(audienceMini)} · ${escapeHtml(session.facets.join(" · "))}</small>
              </span>
              ${mine
                ? '<span class="mine-badge">MY SESSION</span>'
                : capacity.label ? `<span class="capacity-pill ${capacity.className}">${escapeHtml(capacity.label)}</span>` : ""}
            </button>`;
        }).join("")}
      </div>`;

    dayProgramme.querySelectorAll("[data-day-session]").forEach((button) => {
      button.addEventListener("click", () => openDayDetail(button.dataset.daySession));
    });
  }

  function openDayDetail(id) {
    const session = sessionById.get(id);
    if (!session) return;
    const capacity = capacityInfo(session.id);
    dayDetailContent.innerHTML = `
      <p class="rail-kicker">SESSION ${session.block} · ROOM ${escapeHtml(session.room)}</p>
      <h2 id="dayDetailTitle">${escapeHtml(session.title)}</h2>
      <p class="presenter-line">${escapeHtml(session.presenters)}</p>
      <p class="blurb-line">${escapeHtml(session.blurb)}</p>
      <div class="tag-groups">
        <div><span class="tag-group-label">For</span><div class="tag-row">${tagRow(session.audiences)}</div></div>
        <div><span class="tag-group-label">TLF facets</span><div class="tag-row">${tagRow(session.facets, "facet")}</div></div>
        <div><span class="tag-group-label">Focus</span><div class="tag-row">${tagRow(session.themes, "theme")}</div></div>
      </div>
      ${capacity.label ? `<p class="dialog-capacity"><span class="capacity-pill ${capacity.className}">${escapeHtml(capacity.label)}</span></p>` : ""}
    `;
    if (typeof dayDetailDialog.showModal === "function") dayDetailDialog.showModal();
    else dayDetailDialog.setAttribute("open", "");
  }

  async function loadAvailability() {
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });

      if (!response.ok) throw new Error("Availability request failed");

      const data = await response.json();
      registrationOpen = Boolean(data.registrationOpen);
      availabilityLoaded = true;

      for (const item of data.sessions || []) {
        availability.set(item.id, item);

        if (item.full) {
          const session = sessionById.get(item.id);
          if (session && !state.confirmed && state.selections[session.block] === item.id) {
            state.selections[session.block] = "";
          }
        }
      }
      persistState();

      statusBanner.hidden = false;
      if (registrationOpen) {
        statusBanner.className = "status-banner status-open";
        statusBanner.innerHTML =
          "<strong>Registration is open.</strong><span>Availability is live. Your place is held when you confirm your pathway.</span>";
      } else {
        statusBanner.className = "status-banner status-waiting";
        statusBanner.innerHTML =
          "<strong>Preview mode is on.</strong><span>You can complete the full attendee journey with these test sessions. Nothing will be submitted while registration is closed.</span>";
      }

      renderProgramme();
      if (state.confirmed) renderPathwayView();
      updateChrome();
    } catch {
      registrationOpen = false;
      availabilityLoaded = false;
      statusBanner.hidden = false;
      statusBanner.className = "status-banner status-error";
      statusBanner.innerHTML =
        "<strong>Live capacity is reconnecting.</strong><span>You can keep exploring the programme. Confirmation will resume once the connection is restored.</span>";
      renderProgramme();
      updateChrome();
    }
  }

  function saveDraftFromInputs() {
    state.name = nameInput.value.trimStart();
    state.email = emailInput.value.trimStart();
    persistState();
    updateChrome();
  }

  function validateForm() {
    formMessage.textContent = "";
    nameInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");

    if (!state.name.trim()) {
      nameInput.setAttribute("aria-invalid", "true");
      throw new Error("Please enter your name.");
    }

    if (!validEmail(state.email)) {
      emailInput.setAttribute("aria-invalid", "true");
      throw new Error("Please enter a valid email address.");
    }

    if (!allChoicesComplete()) {
      throw new Error("Please choose one workshop in Session 1, Session 2 and Session 3.");
    }
  }

  async function confirmPathway(event) {
    event.preventDefault();

    try {
      state.name = nameInput.value.trim();
      state.email = emailInput.value.trim();
      validateForm();

      if (state.confirmed) {
        showPathway();
        return;
      }

      if (!registrationOpen && !availabilityLoaded) {
        throw new Error("Live capacity could not be checked. Please refresh and try again.");
      }

      submitButton.disabled = true;
      submitButton.textContent = registrationOpen ? "Confirming…" : "Saving test pathway…";

      if (registrationOpen) {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            name: state.name,
            email: state.email,
            website: document.getElementById("website").value,
            selections: {
              1: state.selections[1],
              2: state.selections[2],
              3: state.selections[3]
            }
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 409) await loadAvailability();
          throw new Error(data.error || "We could not save your registration. Please try again.");
        }

        state.mode = "live";
      } else {
        state.mode = "preview";
      }

      state.confirmed = true;
      state.confirmedAt = new Date().toISOString();
      persistState();
      updateChrome();
      renderProgramme();
      renderPathwayView();
      showPathway();
    } catch (error) {
      formMessage.textContent = error.message || "Please check your details and try again.";
      formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      renderReview();
    }
  }

  function resetPreview() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    window.location.reload();
  }

  function initialise() {
    nameInput.value = state.name || "";
    emailInput.value = state.email || "";

    renderFilters();

    if (state.selections[1]) {
      activeBlock = 1;
      inspectedSessionId = state.selections[1];
    } else {
      inspectedSessionId = isMobile() ? "" : sessions.find((session) => session.block === activeBlock)?.id || "";
    }

    renderProgramme();
    updateChrome();

    nameInput.addEventListener("input", saveDraftFromInputs);
    emailInput.addEventListener("input", saveDraftFromInputs);

    clearFilters.addEventListener("click", () => {
      state.audiences = [];
      state.focus = [];
      persistState();
      renderFilters();
      renderProgramme();
    });

    mobileFilterToggle.addEventListener("click", () => {
      const isOpen = personaliseCard.classList.toggle("is-open");
      mobileFilterToggle.setAttribute("aria-expanded", String(isOpen));
      filterToggleLabel.textContent = isOpen ? "Hide filters" : "Show filters";
    });

    mobileDockAction.addEventListener("click", () => {
      const action = mobileDockAction.dataset.action;

      if (action === "block") {
        activeBlock = Number(mobileDockAction.dataset.block || 1);
        inspectedSessionId = state.selections[activeBlock] || "";
        renderProgramme();
        document.querySelector(".programme-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "details") {
        detailsCard.hidden = false;
        detailsCard.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (action === "review") {
        pathwayCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    const onMobileChange = () => {
      if (!isMobile() && !inspectedSessionId) {
        inspectedSessionId = state.selections[activeBlock] || sessions.find((session) => session.block === activeBlock)?.id || "";
        renderProgramme();
      }
      syncResponsiveLayout();
      updateMobileDock();
    };
    if (typeof mobileMedia.addEventListener === "function") {
      mobileMedia.addEventListener("change", onMobileChange);
    } else if (typeof mobileMedia.addListener === "function") {
      mobileMedia.addListener(onMobileChange);
    }

    dayDetailClose.addEventListener("click", () => dayDetailDialog.close());
    dayDetailDialog.addEventListener("click", (event) => {
      if (event.target === dayDetailDialog) dayDetailDialog.close();
    });

    detailChooseButton.addEventListener("click", () => {
      if (inspectedSessionId) selectSession(inspectedSessionId);
    });

    form.addEventListener("submit", confirmPathway);

    navExplore.addEventListener("click", showBuilder);
    navPathway.addEventListener("click", showPathway);
    heroPathwayButton.addEventListener("click", showPathway);
    returningViewButton.addEventListener("click", showPathway);
    browseProgrammeButton.addEventListener("click", showBuilder);
    resetPreviewButton.addEventListener("click", resetPreview);

    if (state.confirmed) {
      showPathway(false);
    } else {
      showBuilder(false);
    }

    loadAvailability();
  }

  initialise();
})();