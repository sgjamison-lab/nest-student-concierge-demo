let conversationId;
let lastQuestion = "";
let support;
const messages = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#question");
const toast = document.querySelector("#toast");

function notify(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 5000);
}

async function ensureConversation() {
  if (conversationId) return conversationId;
  const response = await fetch("/api/conversations", { method: "POST" });
  conversationId = (await response.json()).conversation.id;
  return conversationId;
}

async function getSupport() {
  if (support) return support;
  support = (await (await fetch("/api/support/student-retention")).json()).support;
  document.querySelector("#support-location").textContent = support.location;
  document.querySelector("#support-hours").textContent = support.officeHours;
  return support;
}

function addMessage(role, content, result) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const text = document.createElement("p");
  text.textContent = content;
  bubble.append(text);

  if (result) {
    const tools = document.createElement("div");
    tools.className = "answer-tools";
    result.sources.forEach((source) => {
      const link = document.createElement("a");
      link.href = source.sourceUrl;
      link.textContent = `Source: ${source.title}`;
      tools.append(link);
    });
    const contact = document.createElement("a");
    contact.className = "contact";
    contact.href = result.contact.url;
    contact.textContent = `Contact ${result.contact.office}`;
    tools.append(contact);
    ["Helpful", "Not helpful"].forEach((label) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.onclick = () => sendFeedback(result.message.id, label === "Helpful" ? "helpful" : "not_helpful");
      tools.append(button);
    });
    if (result.escalate && result.status !== "safety") {
      const intro = document.createElement("p");
      intro.className = "support-intro";
      intro.textContent = "I can connect you with Student Retention Services.";
      tools.append(intro);
      [["teams", "Message us in Teams"], ["email", "Email Student Retention"], ["follow_up", "Request follow-up"], ["office_hours", "View office hours"]].forEach(([method, label]) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.onclick = () => contactSupport(method, result.status);
        tools.append(button);
      });
    }
    bubble.append(tools);
  }
  article.append(bubble);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  if (role === "assistant") article.setAttribute("aria-label", "Nest Concierge response");
}

async function ask(question) {
  if (!question.trim()) return;
  lastQuestion = question.trim();
  addMessage("student", lastQuestion);
  input.value = "";
  const id = await ensureConversation();
  const response = await fetch(`/api/conversations/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: lastQuestion })
  });
  const result = await response.json();
  if (!response.ok) return notify(result.error || "Something went wrong.");
  addMessage("assistant", result.answer, result);
}

async function sendFeedback(messageId, rating) {
  await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messageId, rating })
  });
  notify("Thanks for your feedback.");
}

async function logEscalation(method, reason) {
  try {
    const id = await ensureConversation();
    const question = lastQuestion || "Student requested general follow-up.";
    const response = await fetch("/api/escalations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: id,
        question,
        escalationReason: reason || "student_requested_support",
        preferredContactMethod: method
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function contactSupport(method, reason = "student_requested_support") {
  const teamsWindow = method === "teams" ? window.open("about:blank", "_blank") : null;
  if (teamsWindow) teamsWindow.opener = null;
  const details = await getSupport();
  const logged = await logEscalation(method, reason);
  if (!logged) {
    if (teamsWindow) teamsWindow.close();
    return notify("We could not log your support request. Please try again.");
  }
  if (method === "teams") {
    if (teamsWindow) teamsWindow.location.href = details.teamsUrl;
    else window.location.href = details.teamsUrl;
    return notify("Opening Microsoft Teams. Your question was not added to the Teams message.");
  }
  if (method === "email") {
    window.location.href = details.emailUrl;
    return;
  }
  if (method === "office_hours") {
    window.location.href = details.officeHoursUrl;
    return;
  }
  notify(`Follow-up request sent to ${details.office}.`);
}

form.addEventListener("submit", (event) => { event.preventDefault(); ask(input.value); });
document.querySelectorAll("#suggestions button, .topics-card button").forEach((button) => button.addEventListener("click", () => ask(button.dataset.question || button.textContent)));
document.querySelectorAll("[data-contact-method]").forEach((button) => button.addEventListener("click", () => contactSupport(button.dataset.contactMethod)));
document.querySelector("#new-chat").addEventListener("click", () => {
  conversationId = undefined;
  lastQuestion = "";
  messages.innerHTML = '<article class="message assistant"><div class="bubble"><p>New conversation started. What can I help with?</p></div></article>';
  input.focus();
});
getSupport();

async function loadOfficeDirectory() {
  const grid = document.querySelector("#directory-grid");
  const response = await fetch("/api/campus-directory");
  const result = await response.json();
  grid.innerHTML = "";
  if (!response.ok) {
    grid.innerHTML = '<p class="empty-state">The office directory is unavailable right now.</p>';
    grid.setAttribute("aria-busy", "false");
    return;
  }
  result.offices.forEach((office) => {
    const card = document.createElement("article");
    card.className = "directory-card";
    const heading = document.createElement("h3");
    heading.textContent = office.name;
    const actions = document.createElement("div");
    actions.className = "directory-actions";
    if (office.phone) {
      const phone = document.createElement("a");
      phone.href = `tel:+1${office.phone.replace(/\D/g, "")}`;
      phone.textContent = office.phone;
      phone.setAttribute("aria-label", `Call ${office.name} at ${office.phone}`);
      actions.append(phone);
    }
    if (office.email) {
      const email = document.createElement("a");
      email.href = `mailto:${office.email}`;
      email.textContent = office.email;
      actions.append(email);
    }
    if (!office.phone || !office.email) {
      const note = document.createElement("p");
      note.textContent = "More contact details will be added when approved.";
      actions.append(note);
    }
    card.append(heading, actions);
    grid.append(card);
  });
  grid.setAttribute("aria-busy", "false");
}
loadOfficeDirectory();

document.querySelector("#places-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const category = document.querySelector("#places-category").value;
  const radiusMiles = document.querySelector("#places-radius").value;
  const results = document.querySelector("#places-results");
  results.setAttribute("aria-busy", "true");
  results.innerHTML = '<p class="empty-state">Finding current places near Tougaloo College...</p>';
  const response = await fetch(`/api/places/nearby?category=${encodeURIComponent(category)}&radiusMiles=${encodeURIComponent(radiusMiles)}`);
  const data = await response.json();
  if (!response.ok) {
    results.innerHTML = `<p class="empty-state">${data.error || "Places are unavailable right now."}</p>`;
    results.setAttribute("aria-busy", "false");
    return;
  }
  if (!data.places.length) {
    results.innerHTML = `<p class="empty-state">Live in-app listings require an approved places-provider key. <a href="${data.mapsSearchUrl}" target="_blank" rel="noopener noreferrer">View current results in Google Maps</a>.</p>`;
    results.setAttribute("aria-busy", "false");
    return;
  }
  results.innerHTML = "";
  data.places.forEach((place) => {
    const card = document.createElement("article");
    card.className = "place-card";
    const name = document.createElement("strong");
    name.textContent = place.name;
    const type = document.createElement("span");
    type.textContent = `${place.type}${place.rating ? ` · Rating ${place.rating}` : ""}`;
    const address = document.createElement("span");
    address.textContent = place.address;
    const link = document.createElement("a");
    link.href = place.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View in Maps";
    card.append(name, type, address, link);
    results.append(card);
  });
  results.setAttribute("aria-busy", "false");
});

let appointmentOptions;
async function loadAppointmentOptions() {
  appointmentOptions = await (await fetch("/api/appointments/options")).json();
  updateAppointmentProviders();
  const subjectSelect = document.querySelector("#appointment-subject");
  appointmentOptions.tutoringSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = `${subject.name} · Eagle Assistant assignment pending`;
    subjectSelect.append(option);
  });
  const reasonSelect = document.querySelector("#appointment-reason");
  appointmentOptions.retentionReasons.forEach((reason) => {
    const option = document.createElement("option");
    option.value = reason.id;
    option.textContent = reason.label;
    reasonSelect.append(option);
  });
}

function updateAppointmentProviders() {
  if (!appointmentOptions) return;
  const typeId = document.querySelector("#appointment-type").value;
  const providerSelect = document.querySelector("#appointment-provider");
  const subjectLabel = document.querySelector("#appointment-subject-label");
  const subjectSelect = document.querySelector("#appointment-subject");
  const reasonLabel = document.querySelector("#appointment-reason-label");
  const reasonSelect = document.querySelector("#appointment-reason");
  const isTutoring = typeId === "eagle-assistant";
  subjectLabel.hidden = !isTutoring;
  subjectSelect.required = isTutoring;
  reasonLabel.hidden = isTutoring;
  reasonSelect.required = !isTutoring;
  providerSelect.innerHTML = "";
  appointmentOptions.providers.filter((provider) => provider.typeId === typeId).forEach((provider) => {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = `${provider.name} · ${provider.role}`;
    providerSelect.append(option);
  });
}

document.querySelector("#appointment-type").addEventListener("change", updateAppointmentProviders);
document.querySelectorAll("[data-appointment-provider]").forEach((button) => button.addEventListener("click", () => {
  document.querySelector("#appointment-type").value = "retention";
  updateAppointmentProviders();
  document.querySelector("#appointment-provider").value = button.dataset.appointmentProvider;
  document.querySelector("#appointments").scrollIntoView();
  document.querySelector("#appointment-time").focus();
}));
document.querySelector("#appointment-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await fetch("/api/appointments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      typeId: document.querySelector("#appointment-type").value,
      providerId: document.querySelector("#appointment-provider").value,
      reasonId: document.querySelector("#appointment-reason").value,
      subjectId: document.querySelector("#appointment-subject").value,
      startsAt: document.querySelector("#appointment-time").value,
      format: document.querySelector("#appointment-format").value
    })
  });
  const result = await response.json();
  if (!response.ok) return notify(result.error);
  event.target.reset();
  updateAppointmentProviders();
  notify(result.appointment.subjectName
    ? `Tutoring request received for ${result.appointment.subjectName}. Student Retention Services will follow up when an Eagle Assistant is assigned.`
    : "Appointment request received. Student Retention Services will confirm it.");
});
loadAppointmentOptions();

const profileForm = document.querySelector("#profile-form");
const passResult = document.querySelector("#checkin-pass-result");

function storedProfileAccess() {
  try {
    return JSON.parse(localStorage.getItem("nestProvisionalProfile") || "null");
  } catch {
    return null;
  }
}

function showPassControls(access, initialMessage) {
  profileForm.hidden = true;
  passResult.innerHTML = "";
  const message = document.createElement("p");
  message.textContent = initialMessage || `Provisional profile ready for ${access.displayName}.`;
  const status = document.createElement("p");
  status.textContent = "Profile status: unverified. Staff may ask you to confirm your identity.";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-button";
  button.textContent = "Generate five-minute check-in code";
  button.onclick = () => generateCheckInPass(access);
  passResult.append(message, status, button);
  loadOwnAttendance(access);
}

async function loadOwnAttendance(access) {
  const section = document.querySelector("#my-attendance");
  const list = document.querySelector("#my-attendance-list");
  const response = await fetch(`/api/profiles/${access.id}/attendance`, {
    headers: { "x-profile-key": access.profileKey }
  });
  if (!response.ok) {
    section.hidden = true;
    return;
  }
  const result = await response.json();
  section.hidden = false;
  list.innerHTML = "";
  if (!result.attendance.length) {
    list.textContent = "No attendance records yet.";
    return;
  }
  result.attendance.forEach((record) => {
    const article = document.createElement("article");
    article.className = "attendance-item";
    const name = document.createElement("strong");
    name.textContent = record.event?.name || "Retention session";
    const details = document.createElement("p");
    details.textContent = `${record.event?.location || "Location unavailable"} · Checked in ${new Date(record.checkedInAt).toLocaleString()}`;
    article.append(name, details);
    list.append(article);
  });
}

async function generateCheckInPass(access) {
  const response = await fetch(`/api/profiles/${access.id}/check-in-pass`, {
    method: "POST",
    headers: { "x-profile-key": access.profileKey }
  });
  const result = await response.json();
  if (!response.ok) return passResult.textContent = result.error;
  passResult.innerHTML = "";
  const heading = document.createElement("h3");
  heading.textContent = "Your check-in code";
  const instructions = document.createElement("p");
  instructions.textContent = "Show this six-digit code to Student Retention staff. It expires in five minutes.";
  const code = document.createElement("code");
  code.className = "checkin-code";
  code.textContent = result.pass.code;
  const expiry = document.createElement("p");
  expiry.textContent = `Expires: ${new Date(result.pass.expiresAt).toLocaleTimeString()}`;
  const regenerate = document.createElement("button");
  regenerate.type = "button";
  regenerate.className = "primary-button";
  regenerate.textContent = "Generate a new code";
  regenerate.onclick = () => generateCheckInPass(access);
  passResult.append(heading, instructions, code, expiry, regenerate);
  loadOwnAttendance(access);
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      displayName: document.querySelector("#profile-name").value,
      email: document.querySelector("#profile-email").value
    })
  });
  const result = await response.json();
  if (!response.ok) return passResult.textContent = result.error;
  const access = { id: result.profile.id, displayName: result.profile.displayName, profileKey: result.profileKey };
  localStorage.setItem("nestProvisionalProfile", JSON.stringify(access));
  showPassControls(access, "Your provisional profile was created on this device.");
});

const existingProfile = storedProfileAccess();
if (existingProfile) showPassControls(existingProfile);
