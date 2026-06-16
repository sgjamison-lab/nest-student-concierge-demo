const staffHeaders = { "x-nest-role": "staff" };
const toast = document.querySelector("#toast");

function notify(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function empty(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = text;
  return paragraph;
}

function item(title, details, status, actions = []) {
  const article = document.createElement("article");
  article.className = "staff-list-item";
  const heading = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = title;
  const state = document.createElement("span");
  state.className = `staff-status status-${status}`;
  state.textContent = status.replaceAll("_", " ");
  heading.append(name, state);
  const description = document.createElement("p");
  description.textContent = details;
  const controls = document.createElement("div");
  controls.className = "staff-item-actions";
  actions.forEach(([label, handler]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.onclick = handler;
    controls.append(button);
  });
  article.append(heading, description);
  if (actions.length) article.append(controls);
  return article;
}

async function setStatus(kind, id, status) {
  const response = await fetch(`/api/staff/${kind}/${id}/status`, {
    method: "POST",
    headers: { ...staffHeaders, "content-type": "application/json" },
    body: JSON.stringify({ status })
  });
  const result = await response.json();
  if (!response.ok) return notify(result.error);
  notify("Status updated.");
  loadDashboard();
}

async function closeSession(id) {
  const response = await fetch(`/api/staff/events/${id}/close`, { method: "POST", headers: staffHeaders });
  const result = await response.json();
  if (!response.ok) return notify(result.error);
  notify("Session closed.");
  loadDashboard();
}

function renderList(target, records, render, emptyText) {
  target.innerHTML = "";
  if (!records.length) return target.append(empty(emptyText));
  records.forEach((record) => target.append(render(record)));
}

async function loadDashboard() {
  const response = await fetch("/api/staff/dashboard", { headers: staffHeaders });
  const data = await response.json();
  if (!response.ok) return notify(data.error);
  document.querySelector("#metric-appointments").textContent = data.summary.requestedAppointments;
  document.querySelector("#metric-follow-ups").textContent = data.summary.openFollowUps;
  document.querySelector("#metric-sessions").textContent = data.summary.openSessions;
  document.querySelector("#metric-checkins").textContent = data.summary.totalCheckIns;

  renderList(document.querySelector("#staff-appointments"), data.appointments, (appointment) => item(
    appointment.subjectName || appointment.reasonLabel || appointment.typeLabel,
    `${appointment.providerName} · ${new Date(appointment.startsAt).toLocaleString()} · ${appointment.format.replace("_", " ")}`,
    appointment.status,
    appointment.status === "requested" ? [
      ["Confirm", () => setStatus("appointments", appointment.id, "confirmed")],
      ["Decline", () => setStatus("appointments", appointment.id, "declined")]
    ] : appointment.status === "confirmed" ? [
      ["Complete", () => setStatus("appointments", appointment.id, "completed")],
      ["Cancel", () => setStatus("appointments", appointment.id, "cancelled")]
    ] : []
  ), "No appointment requests yet.");

  renderList(document.querySelector("#staff-follow-ups"), data.escalations, (request) => item(
    request.question,
    `${request.preferredContactMethod.replace("_", " ")} · Created ${new Date(request.createdAt).toLocaleString()}`,
    request.status,
    request.status === "new" ? [["Assign to Retention", () => setStatus("escalations", request.id, "assigned")]]
      : request.status === "assigned" ? [["Resolve", () => setStatus("escalations", request.id, "resolved")]]
      : request.status === "resolved" ? [["Close", () => setStatus("escalations", request.id, "closed")]] : []
  ), "No follow-up requests yet.");

  const openEvents = data.events.filter((event) => event.status === "open");
  const eventSelect = document.querySelector("#scan-event");
  eventSelect.innerHTML = "";
  openEvents.forEach((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = `${event.name} · ${event.location}`;
    eventSelect.append(option);
  });
  renderList(document.querySelector("#staff-events"), openEvents, (event) => item(
    event.name, `${event.location} · ${event.eventType.replace("_", " ")}`, event.status,
    [["Close session", () => closeSession(event.id)]]
  ), "No open check-in sessions.");

  renderList(document.querySelector("#staff-attendance"), data.attendance.slice().reverse(), (record) => item(
    record.student?.displayName || "Student profile unavailable",
    `${record.event?.name || "Session unavailable"} · ${record.event?.location || "Location unavailable"} · ${new Date(record.checkedInAt).toLocaleString()}`,
    record.student?.verificationStatus || "unknown"
  ), "No attendance activity yet.");
}

document.querySelector("#event-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await fetch("/api/staff/events", {
    method: "POST",
    headers: { ...staffHeaders, "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
  });
  const result = await response.json();
  if (!response.ok) return notify(result.error);
  event.target.reset();
  notify("Check-in session opened.");
  loadDashboard();
});

document.querySelector("#scan-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await fetch("/api/staff/check-ins", {
    method: "POST",
    headers: { ...staffHeaders, "content-type": "application/json" },
    body: JSON.stringify({ eventId: document.querySelector("#scan-event").value, code: document.querySelector("#scan-code").value.trim() })
  });
  const result = await response.json();
  if (!response.ok) return notify(result.error);
  event.target.reset();
  notify(result.duplicate ? `${result.student.displayName} was already checked in.` : `${result.student.displayName} checked in.`);
  loadDashboard();
});

loadDashboard();
