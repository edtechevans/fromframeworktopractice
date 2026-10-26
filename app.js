(function siteApp() {
  const API_URL = "https://ncrwtmhjrgsritsluipz.supabase.co/functions/v1/from-framework-to-practice-register";
  const STORAGE_KEY = "fftp_pathway_v4";

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
  let searchTerm = "";
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
  const searchInput = document.getElementById("sessionSearch");
  const clearSearchButton = document.getElementById("clearSearch");
  const selectionFeedback = document.getElementById("selectionFeedback");
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
          ? parsed.focus.filter((v) => facets.includes(v))
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
    if (!registrationOpen || !availabilityLoaded || !data) {
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
    const scored = sessions
      .filter((session) => session.block === block)
      .map((session) => ({ id: session.id, score: matchScore(session), slot: session.slot }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.slot - b.slot);

    if (scored.length < 2) return scored.map((item) => item.id);
    if (scored[0].score === scored[scored.length - 1].score) return [];

    return scored.slice(0, 3).map((item) => item.id);
  }

  function matchesSearch(session){
  if(!searchTerm)return true;
  const all=[session.title,session.presenters,session.blurb,...session.facets,...session.themes,...session.audiences].join(" ").toLocaleLowerCase();
  return all.includes(searchTerm.toLocaleLowerCase());
}

  function clearSessionSearch(){
  searchTerm="";
  searchInput.value="";
  clearSearchButton.hidden=true;
  renderProgramme();
  searchInput.focus();
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

    const focusOptions = facets.map((value) => ({ value, label: value }));

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
    detailsCard.hidden = !registrationOpen || (!allChoicesComplete() && !state.confirmed);
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
      mobileDockAction.textContent = count === 0 ? "Choose Block 1" : `Choose Block ${nextBlock}`;
      mobileDockAction.dataset.action = "block";
      mobileDockAction.dataset.block = String(nextBlock);
      return;
    }

    if (!registrationOpen) {
      mobileDockStatus.textContent = "Selections saved in this browser";
      mobileDockAction.textContent = "Review my choices";
      mobileDockAction.dataset.action = "review";
      delete mobileDockAction.dataset.block;
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
    mobileDockAction.textContent = "Review & confirm";
    mobileDockAction.dataset.action = "review";
    delete mobileDockAction.dataset.block;
  }

  function renderBlockTabs() {
    blockTabs.innerHTML = blocks.map((block) => {
      const chosen = sessionById.get(state.selections[block.block]);
      const active = activeBlock === block.block;
      return `
        <button type="button" class="block-tab ${chosen ? "is-complete" : ""}"
          role="tab" aria-controls="blocks" tabindex="${active ? 0 : -1}"
          data-block-tab="${block.block}"
          aria-selected="${active ? "true" : "false"}">
          <span>${escapeHtml(block.label)}</span>
          <small>${searchTerm ? `${sessions.filter((session) => session.block === block.block && matchesSearch(session)).length} matches` : chosen ? "✓ Selected" : "9 sessions"}</small>
        </button>`;
    }).join("");

    blockTabs.querySelectorAll("[data-block-tab]").forEach((button) => {
      function activate(next, restoreFocus = false) {
        activeBlock = next;
        inspectedSessionId = "";
        renderProgramme();
        updateProgress();
        if (restoreFocus) blockTabs.querySelector(`[data-block-tab="${next}"]`)?.focus();
      }
      button.addEventListener("click", () => activate(Number(button.dataset.blockTab)));
      button.addEventListener("keydown", (event) => {
        const value = Number(button.dataset.blockTab);
        const index = blocks.findIndex((item) => item.block === value);
        let next = null;
        if (event.key === "ArrowRight") next = blocks[(index + 1) % blocks.length].block;
        if (event.key === "ArrowLeft") next = blocks[(index - 1 + blocks.length) % blocks.length].block;
        if (event.key === "Home") next = blocks[0].block;
        if (event.key === "End") next = blocks[blocks.length - 1].block;
        if (next === null) return;
        event.preventDefault();
        activate(next, true);
      });
    });
  }

  function renderProgramme() {
    renderBlockTabs();

    const allBlockSessions = sessionsForBlock(activeBlock);
    const blockSessions = allBlockSessions.filter(matchesSearch);
    const recommendedIds = recommendedIdsForBlock(activeBlock);
    const matchingCount = blockSessions.filter((session) => matchScore(session) > 0).length;

    if (searchTerm) {
      matchSummary.textContent = `${blockSessions.length} of ${allBlockSessions.length} sessions match your search`;
    } else if (filtersActive() && recommendedIds.length) {
      matchSummary.textContent = `${recommendedIds.length} strongest ${recommendedIds.length === 1 ? "match" : "matches"} highlighted · all workshops shown`;
    } else if (filtersActive() && matchingCount) {
      matchSummary.textContent = `${matchingCount} workshops match · add another preference to narrow`;
    } else {
      matchSummary.textContent = "9 sessions in this block";
    }

    blocksRoot.innerHTML = `
      <section class="block-panel" role="tabpanel">
        <div class="block-panel-heading">
          <strong>Block ${activeBlock}</strong>
          <span>${blockSessions.length} sessions · up to 15 participants each</span>
        </div>

        <div class="session-list">
          ${blockSessions.length ? blockSessions.map((session) => renderSessionEntry(session, recommendedIds.includes(session.id))).join("") : '<div class="no-results"><strong>No matching sessions in this block.</strong><p>Try another block, or clear your search to see all nine sessions.</p><button type="button" data-clear-search class="secondary-button">Clear search</button></div>'}
        </div>

        ${activeBlock < 3 ? `
          <div class="panel-footer">
            <button type="button" class="next-block" data-next-block="${activeBlock + 1}">
              Browse Block ${activeBlock + 1} →
            </button>
          </div>` : ""}
      </section>`;

    wireProgrammeEvents();

    if (!inspectedSessionId || !sessionById.has(inspectedSessionId) || sessionById.get(inspectedSessionId).block !== activeBlock) {
      inspectedSessionId = "";
    }

    updateInspectedClasses();
    renderSessionDetail();
    renderReview();
    updateProgress();
  }

  function renderSessionEntry(session,recommended=false){
  const capacity=capacityInfo(session.id),chosen=state.selections[session.block]===session.id;
  const expanded=inspectedSessionId===session.id;
  const disabled=chosen||state.confirmed||capacity.full||session.pending;
  const action=session.pending?"Details soon":chosen?"✓ Selected":capacity.full?"Full":state.confirmed?"Closed":"Choose";
  const tags=session.facets.length
     ? session.facets.slice(0,2).map(f=>`<span class="facet-chip">${escapeHtml(f)}</span>`).join("")
       +(session.facets.length>2?`<span class="facet-overflow">+${session.facets.length-2}</span>`:"")
     : session.themes.slice(0,1).map(t=>`<span class="topic-chip">${escapeHtml(t)}</span>`).join("");
  const repeatIn=session.repeatGroup==="macbook"?(session.block===1?3:1):null;
  return `
  <article class="session-entry ${chosen?"is-chosen":""} ${recommended?"is-match":""} ${capacity.full?"is-full":""}" data-session-entry="${escapeHtml(session.id)}">
    <button type="button" class="session-inspect" data-inspect="${escapeHtml(session.id)}" aria-label="View details for ${escapeHtml(session.title)}" aria-controls="session-details-${escapeHtml(session.id)}" aria-expanded="${expanded?"true":"false"}">
      <span class="session-main">
        <span class="session-title-row">
          <span class="session-title">${escapeHtml(session.title)}</span>
          ${recommended&&!chosen?'<span class="match-badge">MATCH</span>':""}
        </span>
        <span class="session-card-presenter">${escapeHtml(session.presenters)}</span>
        <span class="session-mini-tags">${tags}
          ${session.provisional?'<span class="mini-note">Repeat to confirm</span>':""}
          ${capacity.label?`<span class="capacity-pill ${capacity.className}">${escapeHtml(capacity.label)}</span>`:""}
        </span>
        <span class="detail-hint">Details <span class="session-chevron" aria-hidden="true">⌄</span></span>
      </span>
    </button>
    <button type="button" class="quick-choose ${chosen?"is-selected":""}" data-quick-choose="${escapeHtml(session.id)}"
      aria-label="${chosen?"Selected":"Choose"} ${escapeHtml(session.title)} for Block ${session.block}"
      ${disabled?"disabled":""}>${action}</button>
    <div class="mobile-session-detail" id="session-details-${escapeHtml(session.id)}">
      <p class="session-description">${escapeHtml(session.blurb||"Description to follow.")}</p>
      ${session.audiences.length?`<div class="detail-group"><span class="detail-group-label">Suitable for</span><div class="tag-row">${tagRow(session.audiences)}</div></div>`:""}
      ${session.facets.length?`<div class="detail-group"><span class="detail-group-label">TLF connections</span><div class="tag-row">${tagRow(session.facets,"facet")}</div></div>`:""}
      ${session.themes.length?`<div class="detail-group"><span class="detail-group-label">Also connects to</span><div class="tag-row">${tagRow(session.themes,"theme")}</div></div>`:""}
      ${repeatIn?`<p class="repeat-note">Also offered in Block ${repeatIn}.</p>`:""}
      ${session.provisional?'<p class="programme-note">Repeat offering awaiting confirmation.</p>':""}
      ${session.room?`<p class="mobile-room">Room ${escapeHtml(session.room)}</p>`:""}
    </div>
  </article>`;
}

  function wireProgrammeEvents() {
    blocksRoot.querySelectorAll("[data-inspect]").forEach((button) => {
      const id = button.dataset.inspect;
      button.addEventListener("click", () => inspectSession(id));
    });

    blocksRoot.querySelectorAll("[data-quick-choose]").forEach((button) => {
      button.addEventListener("click", () => selectSession(button.dataset.quickChoose));
    });
    blocksRoot.querySelector("[data-clear-search]")?.addEventListener("click", clearSessionSearch);

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

  function inspectSession(id,scrollOnMobile=true){
  const entry=blocksRoot.querySelector(`[data-session-entry="${CSS.escape(id)}"]`);
  const collapse=inspectedSessionId===id&&entry?.classList.contains("is-inspected");
  inspectedSessionId=collapse?"":id;
  updateInspectedClasses();
  renderSessionDetail();
  if(scrollOnMobile&&isMobile()&&!collapse)entry?.scrollIntoView({behavior:"smooth",block:"nearest"});
}

  function updateInspectedClasses() {
    blocksRoot.querySelectorAll("[data-session-entry]").forEach((entry) => {
      const expanded = entry.dataset.sessionEntry === inspectedSessionId;
      entry.classList.toggle("is-inspected", expanded);
      const inspect = entry.querySelector("[data-inspect]");
      inspect?.setAttribute("aria-expanded", String(expanded));
      inspect?.setAttribute("aria-label", `${expanded ? "Hide" : "View"} details for ${sessionById.get(entry.dataset.sessionEntry)?.title || "this session"}`);
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

    detailBlockLabel.textContent = `Block ${session.block}${session.provisional ? " · Repeat to confirm" : ""}`;
    detailCapacity.textContent = capacity.label;
    detailCapacity.className = `capacity-pill ${capacity.className}`;
    detailCapacity.hidden = !capacity.label;

    sessionDetail.innerHTML = `
      <h3>${escapeHtml(session.title)}</h3>
      ${session.room ? `<p class="room-line">Room ${escapeHtml(session.room)}</p>` : ""}
      <p class="presenter-line">${escapeHtml(session.presenters)}</p>
      <p class="blurb-line">${escapeHtml(session.blurb || "Title and description to follow.")}</p>
      ${session.provisional ? '<p class="programme-note">A second offering is proposed and awaiting confirmation.</p>' : ""}

      <div class="tag-groups">
        ${session.audiences.length ? `<div><span class="tag-group-label">For</span><div class="tag-row">${tagRow(session.audiences)}</div></div>` : ""}
        ${session.facets.length ? `<div><span class="tag-group-label">TLF facets</span><div class="tag-row">${tagRow(session.facets, "facet")}</div></div>` : ""}
        ${session.themes.length ? `<div><span class="tag-group-label">Focus</span><div class="tag-row">${tagRow(session.themes, "theme")}</div></div>` : ""}
      </div>`;

    detailChooseButton.classList.toggle("is-selected", chosen);
    detailChooseButton.disabled = state.confirmed || capacity.full || chosen || session.pending;
    detailChooseButton.textContent = session.pending ? "Details to follow" : state.confirmed
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
    if (!session || session.pending) return;

    const capacity = capacityInfo(id);
    if (capacity.full) return;

    state.selections[session.block] = id;
    persistState();

    inspectedSessionId = "";
    renderProgramme();
    updateChrome();
    selectionFeedback.textContent = `Selected ${session.title} for Block ${session.block}. You may change your choice.`;
    blocksRoot.querySelector(`[data-inspect="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
  }

  function removeSelection(block) {
    if (state.confirmed) return;
    state.selections[block] = "";
    persistState();
    renderProgramme();
    updateChrome();
    selectionFeedback.textContent = `Removed choice for Block ${block}.`;
  }

  function renderReview() {
    const count = selectedCount();
    choiceCount.textContent = `${count} / 3`;

    reviewSelections.innerHTML = [1, 2, 3].map((block) => {
      const session = sessionById.get(state.selections[block]);
      if (!session) {
        return `
          <div class="review-item empty">
            <span>Block ${block}</span>
            <strong>Choose a workshop</strong>
          </div>`;
      }

      return `
        <div class="review-item">
          <span>Block ${block}</span>
          <strong>${escapeHtml(session.title)}</strong>
          <small>${escapeHtml(session.presenters)}${session.room ? ` · Room ${escapeHtml(session.room)}` : ""}</small>
          ${state.confirmed ? "" : `<button class="review-remove" type="button" data-remove-block="${block}" aria-label="Remove Block ${block} selection">Remove</button>`}
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
      const confirmationAvailable = registrationOpen && availabilityLoaded;
      submitButton.disabled = !(detailsComplete() && allChoicesComplete() && confirmationAvailable);
      submitButton.textContent = !registrationOpen ? "Registration not yet open" : availabilityLoaded ? "Confirm my pathway" : "Confirmation unavailable";
      submitHelp.textContent = !registrationOpen
        ? "You can explore and keep your selections on this browser; no place is reserved until registration opens."
        : availabilityLoaded
          ? "Your name, email address and choices are used only to manage this event."
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
          <span class="saved-block">Block ${block}</span>
          <h3>${escapeHtml(session.title)}</h3>
          <span class="saved-presenter">${escapeHtml(session.presenters)}</span>
          ${session.room ? `<span class="saved-room">Room ${escapeHtml(session.room)}</span>` : ""}
          <p>${escapeHtml(session.blurb || "Title and description to follow.")}</p>
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
                <small>${[session.room ? `Room ${session.room}` : "", audienceMini, session.facets.join(" · ")].filter(Boolean).map(escapeHtml).join(" · ")}</small>
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
      <p class="rail-kicker">BLOCK ${session.block}${session.room ? ` · ROOM ${escapeHtml(session.room)}` : ""}</p>
      <h2 id="dayDetailTitle">${escapeHtml(session.title)}</h2>
      <p class="presenter-line">${escapeHtml(session.presenters)}</p>
      <p class="blurb-line">${escapeHtml(session.blurb || "Title and description to follow.")}</p>
      ${session.provisional ? '<p class="programme-note">A second offering is proposed and awaiting confirmation.</p>' : ""}
      <div class="tag-groups">
        ${session.audiences.length ? `<div><span class="tag-group-label">For</span><div class="tag-row">${tagRow(session.audiences)}</div></div>` : ""}
        ${session.facets.length ? `<div><span class="tag-group-label">TLF facets</span><div class="tag-row">${tagRow(session.facets, "facet")}</div></div>` : ""}
        ${session.themes.length ? `<div><span class="tag-group-label">Focus</span><div class="tag-row">${tagRow(session.themes, "theme")}</div></div>` : ""}
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
          "<strong>Programme preview · registration not yet open.</strong><span>Explore all 27 listings across three blocks. You can save selections in this browser, but places are not yet reserved.</span>";
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
      throw new Error("Please choose one session in Block 1, Block 2 and Block 3.");
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

      if (!registrationOpen || !availabilityLoaded) {
        throw new Error("Live capacity could not be checked. Please refresh and try again.");
      }

      submitButton.disabled = true;
      submitButton.textContent = "Confirming…";

      {
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
    searchInput.addEventListener("input", () => {
      searchTerm = searchInput.value.trim();
      clearSearchButton.hidden = !searchTerm;
      renderProgramme();
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
    clearSearchButton.addEventListener("click", clearSessionSearch);

    inspectedSessionId = "";

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