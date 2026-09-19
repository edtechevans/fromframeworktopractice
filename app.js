(function siteApp() {
  const API_URL = "https://ncrwtmhjrgsritsluipz.supabase.co/functions/v1/from-framework-to-practice-register";
  const sessionDetails = new Map(window.FFTP_SESSIONS.map((session) => [session.id, session]));
  const availability = new Map();
  const selected = { 1: "", 2: "", 3: "" };
  let activeBlock = 1;
  let registrationOpen = false;

  const form = document.getElementById("registrationForm");
  const blocksRoot = document.getElementById("blocks");
  const reviewCard = document.querySelector(".review-card");
  const submitButton = document.getElementById("submitButton");
  const reviewSelections = document.getElementById("reviewSelections");
  const formMessage = document.getElementById("formMessage");
  const statusBanner = document.getElementById("statusBanner");
  const confirmation = document.getElementById("confirmation");

  const bookingLayout = document.createElement("div");
  bookingLayout.className = "booking-layout";
  blocksRoot.parentNode.insertBefore(bookingLayout, blocksRoot);
  bookingLayout.appendChild(blocksRoot);
  reviewCard.classList.add("selection-rail");
  bookingLayout.appendChild(reviewCard);

  const previewCard = document.createElement("section");
  previewCard.className = "preview-card";
  previewCard.innerHTML =
    '<p class="rail-kicker">SESSION PREVIEW</p>' +
    '<div id="sessionPreview" aria-live="polite">' +
    '<h3>Explore the programme</h3>' +
    '<p>Hover, focus, or select a session to see its presenter and blurb here.</p>' +
    '</div>';
  reviewCard.insertBefore(previewCard, reviewCard.firstChild);

  const count = document.createElement("p");
  count.id = "choiceCount";
  count.className = "choice-count";
  count.textContent = "0 / 3 selected";
  const reviewTitle = document.getElementById("reviewTitle");
  reviewTitle.parentNode.insertBefore(count, reviewTitle.nextSibling);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]
    ));
  }

  function renderBlocks() {
    const tabs = window.FFTP_BLOCKS.map((block) => `
      <button type="button" class="block-tab" role="tab"
        id="tab-block-${block.block}" aria-controls="panel-block-${block.block}"
        aria-selected="${block.block === activeBlock ? "true" : "false"}"
        data-tab-block="${block.block}">
        <span>${escapeHtml(block.label)}</span>
        <small>Choose one session</small>
      </button>
    `).join("");

    const panels = window.FFTP_BLOCKS.map((block) => {
      const sessions = window.FFTP_SESSIONS.filter((session) => session.block === block.block);
      return `
        <section class="block-panel" id="panel-block-${block.block}" role="tabpanel"
          aria-labelledby="tab-block-${block.block}" data-panel-block="${block.block}"
          ${block.block === activeBlock ? "" : "hidden"}>
          <div class="block-panel-heading">
            <strong>${escapeHtml(block.label)}</strong>
            <span>10 sessions · 15 places each</span>
          </div>
          <div class="session-grid">${sessions.map(renderSessionCard).join("")}</div>
          ${block.block < 3 ? `
            <div class="panel-footer">
              <button type="button" class="next-block" data-next-block="${block.block + 1}"
                ${selected[block.block] ? "" : "disabled"}>
                Continue to Block ${block.block + 1} →
              </button>
            </div>` : ""}
        </section>`;
    }).join("");

    blocksRoot.innerHTML =
      `<div class="block-tabs" role="tablist" aria-label="Session blocks">${tabs}</div>` +
      `<div class="block-panels">${panels}</div>`;

    blocksRoot.querySelectorAll("[data-tab-block]").forEach((button) => {
      button.addEventListener("click", () => activateBlock(Number(button.dataset.tabBlock)));
    });
    blocksRoot.querySelectorAll("[data-next-block]").forEach((button) => {
      button.addEventListener("click", () => activateBlock(Number(button.dataset.nextBlock)));
    });
    blocksRoot.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", () => {
        selected[input.dataset.block] = input.value;
        updatePreview(sessionDetails.get(input.value));
        updateReview();
        updateTabStates();
        updateNextButtons();
      });
    });
    blocksRoot.querySelectorAll(".session-card").forEach((card) => {
      const session = sessionDetails.get(card.dataset.sessionId);
      card.addEventListener("mouseenter", () => updatePreview(session));
      card.addEventListener("focusin", () => updatePreview(session));
    });

    updateAvailabilityUI();
    updateTabStates();
    updateNextButtons();
  }

  function renderSessionCard(session) {
    const current = availability.get(session.id);
    const isFull = current?.full ?? false;
    const remaining = current?.remaining;
    const seatText = remaining === undefined ? "Checking…" : isFull ? "Full" : `${remaining} left`;
    const checked = selected[session.block] === session.id;

    return `
      <label class="session-card ${isFull ? "is-full" : ""}" data-session-id="${session.id}">
        <input type="radio" name="block-${session.block}" value="${session.id}"
          data-block="${session.block}" ${isFull ? "disabled" : ""} ${checked ? "checked" : ""} />
        <span class="session-row">
          <span class="selection-dot" aria-hidden="true"></span>
          <span class="session-copy">
            <strong>${escapeHtml(session.title)}</strong>
            <small>Presenter + blurb on preview</small>
          </span>
          <span class="capacity ${isFull ? "capacity-full" : ""}">${seatText}</span>
        </span>
      </label>`;
  }

  function activateBlock(block) {
    activeBlock = block;
    blocksRoot.querySelectorAll("[data-tab-block]").forEach((button) => {
      const isActive = Number(button.dataset.tabBlock) === block;
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });
    blocksRoot.querySelectorAll("[data-panel-block]").forEach((panel) => {
      panel.hidden = Number(panel.dataset.panelBlock) !== block;
    });
    const chosen = sessionDetails.get(selected[block]);
    if (chosen) updatePreview(chosen);
  }

  function updateTabStates() {
    blocksRoot.querySelectorAll("[data-tab-block]").forEach((button) => {
      const block = Number(button.dataset.tabBlock);
      button.classList.toggle("is-complete", Boolean(selected[block]));
      const chosen = sessionDetails.get(selected[block]);
      button.querySelector("small").textContent = chosen ? chosen.title : "Choose one session";
    });
  }

  function updateNextButtons() {
    blocksRoot.querySelectorAll("[data-next-block]").forEach((button) => {
      const currentBlock = Number(button.dataset.nextBlock) - 1;
      button.disabled = !selected[currentBlock];
    });
  }

  function updatePreview(session) {
    if (!session) return;
    const current = availability.get(session.id);
    const places = current
      ? current.full ? "Session full" : `${current.remaining} ${current.remaining === 1 ? "place" : "places"} left`
      : "Checking availability…";
    document.getElementById("sessionPreview").innerHTML = `
      <h3>${escapeHtml(session.title)}</h3>
      <p class="preview-presenter">${escapeHtml(session.presenters)}</p>
      <p>${escapeHtml(session.blurb)}</p>
      <p class="preview-meta"><span>Block ${session.block}</span><strong>${escapeHtml(places)}</strong></p>`;
  }

  function updateAvailabilityUI() {
    for (const [id, data] of availability.entries()) {
      const card = document.querySelector(`[data-session-id="${id}"]`);
      if (!card) continue;
      const radio = card.querySelector('input[type="radio"]');
      const capacity = card.querySelector(".capacity");
      card.classList.toggle("is-full", data.full);
      radio.disabled = data.full;
      capacity.classList.toggle("capacity-full", data.full);
      capacity.textContent = data.full ? "Full" : `${data.remaining} left`;
      if (data.full && radio.checked) {
        radio.checked = false;
        selected[radio.dataset.block] = "";
      }
    }
    updateReview();
    updateTabStates();
    updateNextButtons();
  }

  function updateReview() {
    const chosenSessions = [1, 2, 3].map((block) => sessionDetails.get(selected[block])).filter(Boolean);
    document.getElementById("choiceCount").textContent = `${chosenSessions.length} / 3 selected`;
    submitButton.disabled = !registrationOpen || chosenSessions.length !== 3;

    reviewSelections.innerHTML = [1, 2, 3].map((block) => {
      const session = sessionDetails.get(selected[block]);
      return session
        ? `<div class="review-selection">
            <span>Block ${block}</span>
            <strong>${escapeHtml(session.title)}</strong>
            <small>${escapeHtml(session.presenters)}</small>
            <p>${escapeHtml(session.blurb)}</p>
          </div>`
        : `<div class="review-selection review-missing">
            <span>Block ${block}</span><strong>Choose a session</strong>
          </div>`;
    }).join("");
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
      for (const item of data.sessions || []) availability.set(item.id, item);
      updateAvailabilityUI();

      statusBanner.hidden = false;
      if (!registrationOpen) {
        statusBanner.className = "status-banner status-waiting";
        statusBanner.innerHTML =
          "<strong>Session selection is not open yet.</strong><span>You can explore and test the programme now. Registration will be enabled once the final session list is confirmed.</span>";
      } else {
        statusBanner.className = "status-banner status-open";
        statusBanner.innerHTML =
          "<strong>Registration is open.</strong><span>Availability is live and places are held only when you confirm.</span>";
      }
      updateReview();
    } catch (error) {
      registrationOpen = false;
      statusBanner.hidden = false;
      statusBanner.className = "status-banner status-error";
      statusBanner.innerHTML =
        "<strong>Live availability is temporarily unavailable.</strong><span>Please refresh the page in a moment.</span>";
      updateReview();
    }
  }

  function validateField(input, message) {
    if (!input.value.trim()) {
      input.setAttribute("aria-invalid", "true");
      throw new Error(message);
    }
    input.removeAttribute("aria-invalid");
  }

  function validateEmail(input) {
    const value = input.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      input.setAttribute("aria-invalid", "true");
      throw new Error("Please enter a valid email address.");
    }
    input.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");

    try {
      validateField(nameInput, "Please enter your name.");
      validateField(emailInput, "Please enter your email address.");
      validateEmail(emailInput);
      if (![1, 2, 3].every((block) => selected[block])) {
        throw new Error("Please choose one session in each block.");
      }
      if (!registrationOpen) throw new Error("Registration is not open yet.");

      submitButton.disabled = true;
      submitButton.textContent = "Confirming…";
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          website: document.getElementById("website").value,
          selections: { 1: selected[1], 2: selected[2], 3: selected[3] }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) await loadAvailability();
        throw new Error(data.error || "We could not save your registration. Please try again.");
      }
      showConfirmation(nameInput.value.trim(), emailInput.value.trim());
    } catch (error) {
      formMessage.textContent = error.message || "Please check your details and try again.";
      formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      submitButton.textContent = "Confirm my sessions";
      updateReview();
    }
  });

  function showConfirmation(name, email) {
    document.getElementById("confirmationName").textContent =
      `${name} (${email}), you have a place in each of the sessions below.`;
    document.getElementById("confirmationSelections").innerHTML = [1, 2, 3].map((block) => {
      const session = sessionDetails.get(selected[block]);
      return `<article>
          <span>Block ${block}</span>
          <strong>${escapeHtml(session.title)}</strong>
          <small>${escapeHtml(session.presenters)}</small>
          <p>${escapeHtml(session.blurb)}</p>
        </article>`;
    }).join("");
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
    confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  renderBlocks();
  updateReview();
  loadAvailability();
})();