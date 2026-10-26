(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  const start = function () { api.mount(root, document); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof window === "undefined" ? {} : window, function () {
  "use strict";

  const CONTRACT = "FFTP staff-item-read-v1; year=";
  const FACETS = ["Personalization", "Agency", "Authenticity", "Creativity", "Collaboration", "Taking Action"];

  function fail(code) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }

  function resolveSiteUrl(config, href, contextWebUrl) {
    const page = new URL(href);
    if (page.protocol !== "https:" || !/^[a-z0-9-]+\.sharepoint\.(com|cn)$/i.test(page.hostname)) return null;
    const match = page.pathname.match(/^\/(?:sites|teams)\/[^/]+/i);
    const candidate = config.siteUrl || contextWebUrl || page.origin + (match ? match[0] : "");
    const site = new URL(candidate, page.origin);
    if (site.origin !== page.origin || site.username || site.password || site.search || site.hash) fail("configuration");
    return site.origin + site.pathname.replace(/\/+$/, "");
  }

  function positiveId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) fail("identity");
    return id;
  }

  function renderFacetText(element, value, doc) {
    element.textContent = "";
    const parts = String(value).split(/(\b(?:Personalization|Agency|Authenticity|Creativity|Collaboration|Taking\s+Action)\b)/gi);
    for (const part of parts) {
      const canonical = FACETS.find(function (name) { return name.toLowerCase() === part.replace(/\s+/g, " ").toLowerCase(); });
      if (!canonical) element.appendChild(doc.createTextNode(part));
      else {
        const span = doc.createElement("span");
        span.className = "facet-inline tlf-facet";
        span.setAttribute("data-tlf-facet", canonical);
        span.textContent = part;
        element.appendChild(span);
      }
    }
  }

  function createGoalClient(options) {
    const siteUrl = options.siteUrl;
    const origin = options.origin;
    const fetchImpl = options.fetchImpl;
    const academicYear = options.academicYear || "2026-27";
    const listTitle = options.listTitle || "FFTP Professional Goals 2627";
    if (new URL(siteUrl).origin !== origin || !/^\d{4}-\d{2}$/.test(academicYear)) fail("configuration");
    const listPath = siteUrl + "/_api/web/lists/getByTitle('" + encodeURIComponent(listTitle.replace(/'/g, "''")) + "')";

    async function read(url, signal) {
      if (new URL(url).origin !== origin) fail("configuration");
      const response = await fetchImpl(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { Accept: "application/json;odata=nometadata" },
        signal: signal
      });
      if (response.status === 401) fail("sign-in");
      if (response.status === 403) fail("access");
      if (!response.ok) fail("unavailable");
      return response.json();
    }

    async function identity(signal) {
      const payload = await read(siteUrl + "/_api/web/currentuser?$select=Id,Title", signal);
      const user = payload.d || payload;
      return { id: positiveId(user.Id), name: typeof user.Title === "string" ? user.Title.slice(0, 200) : "" };
    }

    // No email, name or user ID supplied by a URL, form or local storage is accepted.
    async function load(signal) {
      const user = await identity(signal);
      const payload = await read(listPath + "?$select=Id,Description,HasUniqueRoleAssignments", signal);
      const list = payload.d || payload;
      if (list.HasUniqueRoleAssignments !== true || list.Description !== CONTRACT + academicYear) fail("not-ready");
      const query = new URL(listPath + "/items");
      query.searchParams.set("$select", "Id,StaffId,AcademicYear,ChosenFacet,ChosenDomain,ProfessionalGoal");
      query.searchParams.set("$filter", "StaffId eq " + user.id + " and AcademicYear eq '" + academicYear + "'");
      query.searchParams.set("$top", "2");
      const data = await read(query.href, signal);
      const rows = data.value || (data.d && data.d.results);
      if (!Array.isArray(rows) || rows.length > 1 || data["@odata.nextLink"] || (data.d && data.d.__next)) fail("ambiguous");
      // A second identity check prevents a response from an earlier account being shown.
      const current = await identity(signal);
      if (current.id !== user.id) fail("account-changed");
      if (rows.length === 0) return { status: "missing", name: current.name };
      const row = rows[0];
      if (positiveId(row.StaffId) !== current.id || row.AcademicYear !== academicYear) fail("owner");
      for (const field of ["ChosenFacet", "ChosenDomain", "ProfessionalGoal"]) {
        if (row[field] !== null && row[field] !== undefined && typeof row[field] !== "string") fail("invalid");
      }
      return {
        status: "ready",
        name: current.name,
        facet: row.ChosenFacet || "",
        domain: row.ChosenDomain || "",
        goal: row.ProfessionalGoal || ""
      };
    }
    return Object.freeze({ load: load });
  }

  function mount(win, doc) {
    const tile = doc.getElementById("personalGoalTile");
    if (!tile) return;
    const status = doc.getElementById("personalGoalStatus");
    const fields = doc.getElementById("personalGoalFields");
    const account = doc.getElementById("personalGoalAccount");
    const facet = doc.getElementById("personalGoalFacet");
    const domain = doc.getElementById("personalGoalDomain");
    const statement = doc.getElementById("personalGoalStatement");
    const toggle = doc.getElementById("personalGoalToggle");
    const config = win.FFTP_GOALS_CONFIG || {};
    let controller = null;
    let generation = 0;
    let activeRecord = false;

    function clear(message, state) {
      activeRecord = false;
      fields.hidden = true;
      account.textContent = "";
      facet.textContent = "";
      facet.removeAttribute("data-tlf-facet");
      facet.classList.remove("tlf-facet");
      domain.textContent = "";
      statement.textContent = "";
      statement.classList.remove("is-expanded");
      toggle.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Read full goal";
      status.textContent = message;
      status.hidden = false;
      tile.dataset.state = state;
    }

    function measureGoal() {
      if (!activeRecord || statement.classList.contains("is-expanded")) return;
      toggle.hidden = statement.scrollHeight <= statement.clientHeight + 2;
    }

    function toggleGoal() {
      const expanded = statement.classList.toggle("is-expanded");
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "Show less" : "Read full goal";
      if (!expanded) measureGoal();
    }
    toggle.addEventListener("click", toggleGoal);

    async function load() {
      const attempt = ++generation;
      if (controller) controller.abort();
      clear("Loading your professional growth focus…", "loading");
      let siteUrl;
      try {
        siteUrl = resolveSiteUrl(config, win.location.href, win._spPageContextInfo && win._spPageContextInfo.webAbsoluteUrl);
      } catch (_) {
        clear("Your growth focus is not available yet. Please contact Tim Evans.", "unavailable");
        return;
      }
      if (!siteUrl) {
        clear("Your chosen facet, domain and professional goal will appear here in the AISG SharePoint version.", "sharepoint");
        return;
      }
      const requestController = new win.AbortController();
      controller = requestController;
      const timer = win.setTimeout(function () { requestController.abort(); }, 15000);
      try {
        const client = createGoalClient({
          siteUrl: siteUrl,
          origin: win.location.origin,
          academicYear: config.academicYear,
          listTitle: config.listTitle,
          fetchImpl: win.fetch.bind(win)
        });
        const record = await client.load(requestController.signal);
        if (attempt !== generation || doc.visibilityState === "hidden") return;
        if (record.status === "missing") {
          clear("No professional goal is linked to your AISG account yet. Please contact Tim Evans to check your record.", "missing");
          return;
        }
        account.textContent = record.name;
        facet.textContent = record.facet || "Not yet recorded";
        const canonical = FACETS.find(function (name) { return name.toLowerCase() === record.facet.trim().toLowerCase(); });
        if (canonical) {
          facet.classList.add("tlf-facet");
          facet.setAttribute("data-tlf-facet", canonical);
        }
        renderFacetText(domain, record.domain || "Not yet recorded", doc);
        renderFacetText(statement, record.goal || "No professional goal has been recorded yet.", doc);
        fields.hidden = false;
        status.hidden = true;
        activeRecord = true;
        tile.dataset.state = "ready";
        win.requestAnimationFrame(measureGoal);
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measureGoal);
      } catch (error) {
        if (attempt !== generation || doc.visibilityState === "hidden") return;
        const message = error.code === "sign-in"
          ? "Sign in to AISG with Microsoft to see your professional growth focus."
          : "Your growth focus is not available yet. Please contact Tim Evans if this continues.";
        clear(message, "unavailable");
      } finally {
        win.clearTimeout(timer);
      }
    }

    function forget() {
      generation += 1;
      if (controller) controller.abort();
      clear("Your professional growth focus will reload when you return.", "loading");
    }

    function restore(event) { if (event.persisted) load(); }
    function visibilityChanged() {
      if (doc.visibilityState === "hidden") forget();
      else load();
    }
    win.addEventListener("pagehide", forget);
    win.addEventListener("pageshow", restore);
    doc.addEventListener("visibilitychange", visibilityChanged);
    win.addEventListener("resize", measureGoal);
    load();
    // SPFx integrations must call this when their web part is disposed.
    return function dispose() {
      forget();
      win.removeEventListener("pagehide", forget);
      win.removeEventListener("pageshow", restore);
      win.removeEventListener("resize", measureGoal);
      doc.removeEventListener("visibilitychange", visibilityChanged);
      toggle.removeEventListener("click", toggleGoal);
    };
  }

  return Object.freeze({ resolveSiteUrl: resolveSiteUrl, createGoalClient: createGoalClient, renderFacetText: renderFacetText, mount: mount });
});
