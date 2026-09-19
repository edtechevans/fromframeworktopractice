(() => {
  const API_URL = "https://ncrwtmhjrgsritsluipz.supabase.co/functions/v1/from-framework-to-practice-register";
  const sessionDetails = new Map(window.FFTP_SESSIONS.map((session) => [session.id, session]));
  const availability = new Map();
  const selected = { 1: "", 2: "", 3: "" };

  const form = document.getElementById("registrationForm");
  const blocksRoot = document.getElementById("blocks");
  const submitButton = document.getElementById("submitButton");
  const reviewSelections = document.getElementById("reviewSelections");
  const formMessage = document.getElementById("formMessage");
  const statusBanner = document.getElementById("statusBanner");
  const confirmation = document.getElementById("confirmation");

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function renderBlocks() {
    blocksRoot.innerHTML = window.FFTP_BLOCKS.map((block) => {
      const sessions = window.FFTP_SESSIONS.filter((session) => session.block === block.block);
      return `
        <fieldset class="session-block" data-block="${block.block}">
          <legend>
            <span class="block-kicker">BLOCK ${String(block.block).padStart(2, "0")}</span>
            <span class="block-title">${escapeHtml(block.label)}</span>
            <span class="block-subtitle">${escapeHtml(block.subtitle)}</span>
          </legend>
          <div class="session-grid">
            ${sessions.map(renderSessionCard).join("")}
          </div>
        </fieldset>
      `;
    }).join("");

    blocksRoot.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", () => {
        selected[input.dataset.block] = input.value;
        updateReview();
      });
    });
  }

  function renderSessionCard(session) {
    const current = availability.get(session.id);
    const isFull = current?.full ?? false;
    const remaining = current?.remaining;
    const seatText = remaining === undefined ? "Checking places…" : isFull ? "Full" : `${remaining} ${remaining === 1 ? "place" : "places"} left`;

    return `
      <label class="session-card ${isFull ? "is-full" : ""}" data-session-id="${session.id}">
        <input
          type="radio"
          name="block-${session.block}"
          value="${session.id}"
          data-block="${session.block}"
          ${isFull ? "disabled" : ""}
        />
        <span class="session-card-body">
          <span class="session-topline">
            <span class="session-number">${String(session.slot).padStart(2, "0")}</span>
            <span class="capacity ${isFull ? "capacity-full" : ""}">${seatText}</span>
          </span>
          <strong>${escapeHtml(session.title)}</strong>
          <span class="presenters">${escapeHtml(session.presenters)}</span>
          <span class="blurb">${escapeHtml(session.blurb)}</span>
          <span class="choose-indicator"><i></i><b>${isFull ? "Session full" : "Choose this session"}</b></span>
        </span>
      </label>
    `;
  }

  function updateAvailabilityUI() {
    for (const [id, data] of availability.entries()) {
      const card = document.querySelector(`[data-session-id="${id}"]`);
      if (!card) continue;
      const radio = card.querySelector('input[type="radio"]');
      const capacity = card.querySelector(".capacity");
      const choose = card.querySelector(".choose-indicator b");

      card.classList.toggle("is-full", data.full);
      radio.disabled = data.full;
      capacity.classList.toggle("capacity-full", data.full);
      capacity.textContent = data.full ? "Full" : `${data.remaining} ${data.remaining === 1 ? "place" : "places"} left`;
      choose.textContent = data.full ? "Session full" : "Choose this session";

      if (data.full && radio.checked) {
        radio.checked = false;
        selected[radio.dataset.block] = "";
      }
    }
    updateReview();
  }

  function updateReview() {
    const chosenSessions = [1, 2, 3].map((block) => sessionDetails.get(selected[block])).filter(Boolean);
    submitButton.disabled = chosenSessions.length !== 3;

    if (!chosenSessions.length) {
      reviewSelections.innerHTML = '<p class="review-empty">Choose one session in each block to continue.</p>';
      return;
    }

    reviewSelections.innerHTML = [1, 2, 3].map((block) => {
      const session = sessionDetails.get(selected[block]);
      return session
        ? `<div><span>Block ${block}</span><strong>${escapeHtml(session.title)}</strong><small>${escapeHtml(session.presenters)}</small></div>`
        : `<div class="review-missing"><span>Block ${block}</span><strong>Choose a session</strong></div>`;
    }).join("");
  }

  async function loadAvailability() {
    try {
      const response = await fetch(API_URL, { method: "GET", headers: { "Accept": "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Availability request failed");
      const data = await response.json();

      for (const item of data.sessions || []) availability.set(item.id, item);
      updateAvailabilityUI();

      if (!data.registrationOpen) {
        statusBanner.hidden = false;
        statusBanner.className = "status-banner status-waiting";
        statusBanner.innerHTML = "<strong>Session selection is not open yet.</strong><span>You can explore the programme now. Registration will be enabled once the final session list is confirmed.</span>";
        submitButton.disabled = true;
      } else {
        statusBanner.hidden = false;
        statusBanner.className = "status-banner status-open";
        statusBanner.innerHTML = "<strong>Registration is open.</strong><span>Availability is live and places are held only when you confirm.</span>";
      }
    } catch (error) {
      statusBanner.hidden = false;
      statusBanner.className = "status-banner status-error";
      statusBanner.innerHTML = "<strong>Live availability is temporarily unavailable.</strong><span>Please refresh the page in a moment.</span>";
      submitButton.disabled = true;
    }
  }

  function validateName(input, label) {
    if (!input.value.trim()) {
      input.setAttribute("aria-invalid", "true");
      throw new Error(`Please enter your ${label}.`);
    }
    input.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");

    try {
      validateName(firstName, "first name");
      validateName(lastName, "last name");

      if (![1, 2, 3].every((block) => selected[block])) {
        throw new Error("Please choose one session in each block.");
      }

      submitButton.disabled = true;
      submitButton.textContent = "Confirming…";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          firstName: firstName.value.trim(),
          lastName: lastName.value.trim(),
          website: document.getElementById("website").value,
          selections: { 1: selected[1], 2: selected[2], 3: selected[3] }
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) await loadAvailability();
        throw new Error(data.error || "We could not save your registration. Please try again.");
      }

      showConfirmation(firstName.value.trim(), lastName.value.trim());
    } catch (error) {
      formMessage.textContent = error.message || "Please check your details and try again.";
      formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
      submitButton.disabled = ![1, 2, 3].every((block) => selected[block]);
    } finally {
      submitButton.textContent = "Confirm my sessions";
    }
  });

  function showConfirmation(firstName, lastName) {
    document.getElementById("confirmationName").textContent = `${firstName} ${lastName}, you have a place in each of the sessions below.`;
    document.getElementById("confirmationSelections").innerHTML = [1, 2, 3].map((block) => {
      const session = sessionDetails.get(selected[block]);
      return `<article><span>Block ${block}</span><strong>${escapeHtml(session.title)}</strong><small>${escapeHtml(session.presenters)}</small></article>`;
    }).join("");

    form.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
    confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  renderBlocks();
  loadAvailability();
})();
