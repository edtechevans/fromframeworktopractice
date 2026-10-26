const test = require("node:test");
const assert = require("node:assert/strict");
const { createGoalClient, resolveSiteUrl, renderFacetText, mount } = require("../goal-tile.js");

const siteUrl = "https://school.sharepoint.com/sites/learning";
const origin = new URL(siteUrl).origin;
const contract = "FFTP staff-item-read-v1; year=2026-27";
const row = (id, goal) => ({
  Id: id, StaffId: id, AcademicYear: "2026-27",
  ChosenFacet: "Agency", ChosenDomain: "Example domain", ProfessionalGoal: goal
});

function clientWith(responses) {
  const calls = [];
  const client = createGoalClient({
    siteUrl, origin,
    fetchImpl: async function (url, options) {
      calls.push({ url, options });
      assert(responses.length > 0, "Unexpected additional request");
      const response = responses.shift();
      return { ok: !response.status || response.status === 200, status: response.status || 200,
        json: async () => response.body };
    }
  });
  return { client, calls };
}
function successfulResponses(id, goal) {
  return [
    { body: { Id: id, Title: "Example staff member" } },
    { body: { HasUniqueRoleAssignments: true, Description: contract } },
    { body: { value: [row(id, goal)] } },
    { body: { Id: id, Title: "Example staff member" } }
  ];
}

test("public hosting never resolves a SharePoint data source", () => {
  assert.equal(resolveSiteUrl({}, "https://edtechevans.github.io/fromframeworktopractice/"), null);
  assert.equal(resolveSiteUrl({}, siteUrl + "/SiteAssets/fftp/index.aspx?userId=999&email=other"), siteUrl);
  assert.throws(() => resolveSiteUrl({ siteUrl: "https://different.sharepoint.com/sites/private" }, siteUrl), { code: "configuration" });
});

test("request identity is obtained from SharePoint and is not taken from the signup form", async () => {
  const { client, calls } = clientWith(successfulResponses(17, "Own example goal"));
  const result = await client.load();
  assert.equal(result.goal, "Own example goal");
  const query = new URL(calls[2].url);
  assert.equal(query.searchParams.get("$filter"), "StaffId eq 17 and AcademicYear eq '2026-27'");
  assert.equal(query.searchParams.get("$top"), "2");
  assert(!query.searchParams.get("$select").includes("StaffKey"));
  for (const call of calls) {
    assert.equal(call.options.credentials, "same-origin");
    assert.equal(call.options.cache, "no-store");
    assert.equal(call.options.redirect, "error");
    assert.equal(call.options.method, "GET");
  }
});

test("different signed-in users receive independent records with no client cache", async () => {
  const { client, calls } = clientWith([...successfulResponses(17, "First example goal"), ...successfulResponses(18, "Second example goal")]);
  assert.equal((await client.load()).goal, "First example goal");
  assert.equal((await client.load()).goal, "Second example goal");
  assert.equal(new URL(calls[6].url).searchParams.get("$filter"), "StaffId eq 18 and AcademicYear eq '2026-27'");
  assert.equal(calls.length, 8);
});

test("unsecured or incompletely provisioned lists are rejected before requesting goal fields", async () => {
  for (const metadata of [
    { HasUniqueRoleAssignments: false, Description: contract },
    { HasUniqueRoleAssignments: true, Description: "Import incomplete" }
  ]) {
    const { client, calls } = clientWith([{ body: { Id: 17 } }, { body: metadata }]);
    await assert.rejects(client.load(), { code: "not-ready" });
    assert.equal(calls.length, 2);
  }
});

test("foreign owners, duplicate records and account changes fail closed", async () => {
  const foreign = successfulResponses(17, "Own example");
  foreign[2].body.value = [row(18, "Other example")];
  await assert.rejects(clientWith(foreign).client.load(), { code: "owner" });
  const duplicate = successfulResponses(17, "Own example");
  duplicate[2].body.value.push(row(17, "Ambiguous example"));
  await assert.rejects(clientWith(duplicate).client.load(), { code: "ambiguous" });
  const changed = successfulResponses(17, "Own example");
  changed[3].body.Id = 18;
  await assert.rejects(clientWith(changed).client.load(), { code: "account-changed" });
});

test("anonymous users cannot request any goal fields", async () => {
  const { client, calls } = clientWith([{ status: 401 }]);
  await assert.rejects(client.load(), { code: "sign-in" });
  assert.equal(calls.length, 1);
});

test("missing records have a specific state and do not borrow another record", async () => {
  const response = successfulResponses(17, "");
  response[2].body.value = [];
  const result = await clientWith(response).client.load();
  assert.equal(result.status, "missing");
  assert.equal(result.goal, undefined);
});

class Element {
  constructor() {
    this.children = []; this.attributes = {}; this.dataset = {}; this.hidden = false;
    this._text = ""; this.events = {};
    const classes = new Set();
    this.classList = {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); },
      toggle(value) { if (classes.has(value)) { classes.delete(value); return false; } classes.add(value); return true; }
    };
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(n => n.textContent).join(""); }
  appendChild(node) { this.children.push(node); }
  setAttribute(k, v) { this.attributes[k] = v; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(name, handler) { this.events[name] = handler; }
}
const fakeDocument = () => {
  const elements = {}, handlers = {};
  return { elements, handlers, visibilityState: "visible",
    getElementById(id) { return elements[id] || (elements[id] = new Element()); },
    createElement() { return new Element(); },
    createTextNode(value) { return { textContent: value }; },
    addEventListener(name, handler) { handlers[name] = handler; } };
};

test("goal prose remains inert text while facet names retain their colours", () => {
  const doc = fakeDocument(), element = new Element();
  const text = 'Agency <img src=x onerror="bad()"> and collaboration';
  renderFacetText(element, text, doc);
  assert.equal(element.textContent, text);
  assert.equal(element.children.filter(n => n.attributes).length, 2);
  assert.deepEqual(element.children.filter(n => n.attributes).map(n => n.attributes["data-tlf-facet"]), ["Agency", "Collaboration"]);
});

test("the public tile makes no request and never accesses browser storage", () => {
  const doc = fakeDocument();
  let requests = 0;
  const win = {
    location: { href: "https://edtechevans.github.io/fromframeworktopractice/" },
    fetch() { requests++; },
    addEventListener() {},
    get localStorage() { throw new Error("Storage must not be used for staff goals"); },
    get sessionStorage() { throw new Error("Storage must not be used for staff goals"); }
  };
  mount(win, doc);
  assert.equal(requests, 0);
  assert.equal(doc.elements.personalGoalFields.hidden, true);
  assert(doc.elements.personalGoalStatus.textContent.includes("SharePoint version"));
});

test("a ready tile is cleared immediately when hidden or an account may change", async () => {
  const doc = fakeDocument(), responses = successfulResponses(17, "An Agency example goal.");
  const win = {
    location: { href: siteUrl + "/SitePages/example.aspx", origin },
    fetch: async () => ({ ok: true, status: 200, json: async () => responses.shift().body }),
    AbortController,
    setTimeout, clearTimeout,
    requestAnimationFrame(callback) { callback(); },
    addEventListener() {},
    get localStorage() { throw new Error("Private records must not be cached"); }
  };
  mount(win, doc);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(doc.elements.personalGoalFields.hidden, false);
  assert.equal(doc.elements.personalGoalStatement.textContent, "An Agency example goal.");
  doc.visibilityState = "hidden";
  doc.handlers.visibilitychange();
  assert.equal(doc.elements.personalGoalFields.hidden, true);
  for (const key of ["personalGoalFacet", "personalGoalDomain", "personalGoalStatement", "personalGoalAccount"]) {
    assert.equal(doc.elements[key].textContent, "");
  }
});
