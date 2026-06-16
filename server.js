const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { buildAnswer, searchKnowledgeBase } = require("./concierge");
const { MemoryStore, PersistentStore } = require("./store");
const { studentRetentionSupport } = require("./support");
const { retentionStaff } = require("./retention-staff");
const { officeDirectory } = require("./office-directory");
const { categories, findNearbyPlaces } = require("./places");
const { appointmentTypes, createAppointment, formats, providers, retentionReasons, tutoringSubjects } = require("./appointments");
const { authorizeProfile, createEvent, createProvisionalProfile, issueCheckInCredential, verifyCheckInCredential } = require("./checkin");
const { hasPermission, isRole, publicRoles } = require("./roles");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");
const dataFile = process.env.NEST_DATA_FILE || path.join(__dirname, "..", "data", "nest-data.json");
const store = process.env.NEST_EPHEMERAL === "true" ? new MemoryStore() : new PersistentStore(dataFile);

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function role(req) {
  if (process.env.NEST_PUBLIC_DEMO === "true") return "student";
  return req.headers["x-nest-role"] || "student";
}

function requirePermission(req, res, permission) {
  if (!hasPermission(role(req), permission)) {
    send(res, 403, { error: "Your user profile does not permit this action." });
    return false;
  }
  return true;
}

function requireAnyPermission(req, res, permissions) {
  if (!permissions.some((permission) => hasPermission(role(req), permission))) {
    send(res, 403, { error: "Your user profile does not permit this action." });
    return false;
  }
  return true;
}

function publicProfile(profile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    verificationStatus: profile.verificationStatus,
    status: profile.status,
    createdAt: profile.createdAt
  };
}

function requireProfileOwner(req, res, profileId) {
  const profile = store.profiles.find((item) => item.id === profileId && item.status === "active");
  if (!authorizeProfile(profile, req.headers["x-profile-key"])) {
    send(res, 403, { error: "Profile access could not be verified." });
    return null;
  }
  return profile;
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true, storage: store.persistent ? "local_file" : "memory" });
  if (req.method === "GET" && url.pathname === "/api/admin/roles") {
    if (!requirePermission(req, res, "roles.manage")) return;
    return send(res, 200, { roles: publicRoles() });
  }
  if (req.method === "POST" && url.pathname === "/api/admin/user-roles") {
    if (!requirePermission(req, res, "roles.manage")) return;
    const input = await readJson(req);
    if (!input.userSubject || !isRole(input.role)) return send(res, 400, { error: "Valid user subject and role are required." });
    return send(res, 201, { assignment: store.assignUserRole({ ...input, assignedBy: "super-user" }) });
  }
  if (req.method === "GET" && url.pathname === "/api/support/student-retention") {
    return send(res, 200, { support: studentRetentionSupport });
  }
  if (req.method === "GET" && url.pathname === "/api/support/student-retention/staff") {
    return send(res, 200, { staff: retentionStaff });
  }
  if (req.method === "GET" && url.pathname === "/api/campus-directory") {
    return send(res, 200, {
      offices: officeDirectory,
      notice: "This starter directory is not yet a complete list of Tougaloo College offices."
    });
  }
  if (req.method === "GET" && url.pathname === "/api/places/categories") {
    return send(res, 200, { categories: Object.entries(categories).map(([id, item]) => ({ id, label: item.label })) });
  }
  if (req.method === "GET" && url.pathname === "/api/places/nearby") {
    try {
      return send(res, 200, await findNearbyPlaces(url.searchParams.get("category"), url.searchParams.get("radiusMiles")));
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/appointments/options") {
    return send(res, 200, { appointmentTypes, providers, retentionReasons, tutoringSubjects, formats, microsoft365SyncEnabled: false });
  }
  if (req.method === "POST" && url.pathname === "/api/appointments") {
    try {
      const input = await readJson(req);
      return send(res, 201, { appointment: store.addAppointment(createAppointment({ ...input, studentId: null, studentEmail: null })) });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/profiles") {
    try {
      const input = await readJson(req);
      if (store.profiles.some((item) => item.email === String(input.email || "").trim().toLowerCase())) {
        return send(res, 409, { error: "A provisional profile already exists for this Tougaloo email on the backend." });
      }
      const { profile, profileKey } = createProvisionalProfile(input);
      store.addProfile(profile);
      return send(res, 201, { profile: publicProfile(profile), profileKey, warning: "Save this recovery key. It is shown once." });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname.match(/^\/api\/profiles\/[^/]+\/check-in-pass$/)) {
    const profileId = url.pathname.split("/")[3];
    const profile = requireProfileOwner(req, res, profileId);
    if (!profile) return;
    const securePass = issueCheckInCredential(profile);
    return send(res, 201, { pass: store.addCheckInPass(profile.id, securePass.credential, securePass.expiresAt) });
  }
  if (req.method === "GET" && url.pathname.match(/^\/api\/profiles\/[^/]+$/)) {
    const profileId = url.pathname.split("/")[3];
    const profile = requireProfileOwner(req, res, profileId);
    if (!profile) return;
    return send(res, 200, { profile: publicProfile(profile) });
  }
  if (req.method === "GET" && url.pathname.match(/^\/api\/profiles\/[^/]+\/attendance$/)) {
    const profileId = url.pathname.split("/")[3];
    const profile = requireProfileOwner(req, res, profileId);
    if (!profile) return;
    return send(res, 200, { attendance: store.attendanceForProfile(profile.id) });
  }
  if (req.method === "GET" && url.pathname === "/api/staff/events") {
    if (!requireAnyPermission(req, res, ["events.read", "events.manage"])) return;
    return send(res, 200, { events: store.events });
  }
  if (req.method === "GET" && url.pathname === "/api/staff/dashboard") {
    if (!requirePermission(req, res, "retention.manage")) return;
    return send(res, 200, {
      summary: {
        requestedAppointments: store.appointments.filter((item) => item.status === "requested").length,
        openFollowUps: store.escalations.filter((item) => ["new", "assigned"].includes(item.status)).length,
        openSessions: store.events.filter((item) => item.status === "open").length,
        totalCheckIns: store.attendance.length
      },
      appointments: store.appointments,
      escalations: store.escalations,
      events: store.events,
      attendance: store.staffAttendance()
    });
  }
  if (req.method === "POST" && url.pathname.match(/^\/api\/staff\/appointments\/[^/]+\/status$/)) {
    if (!requirePermission(req, res, "retention.manage")) return;
    const appointmentId = url.pathname.split("/")[4];
    const input = await readJson(req);
    if (!["confirmed", "completed", "cancelled", "declined"].includes(input.status)) return send(res, 400, { error: "Choose a valid appointment status." });
    try {
      return send(res, 200, { appointment: store.updateAppointmentStatus(appointmentId, input.status) });
    } catch (error) {
      return send(res, 404, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname.match(/^\/api\/staff\/escalations\/[^/]+\/status$/)) {
    if (!requirePermission(req, res, "retention.manage")) return;
    const escalationId = url.pathname.split("/")[4];
    const input = await readJson(req);
    if (!["assigned", "resolved", "closed"].includes(input.status)) return send(res, 400, { error: "Choose a valid follow-up status." });
    try {
      return send(res, 200, { escalation: store.updateEscalationStatus(escalationId, input.status) });
    } catch (error) {
      return send(res, 404, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/staff/events") {
    if (!requirePermission(req, res, "events.manage")) return;
    try {
      return send(res, 201, { event: store.addEvent(createEvent(await readJson(req))) });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname.match(/^\/api\/staff\/events\/[^/]+\/close$/)) {
    if (!requirePermission(req, res, "events.manage")) return;
    const eventId = url.pathname.split("/")[4];
    try {
      return send(res, 200, { event: store.closeEvent(eventId) });
    } catch (error) {
      return send(res, 404, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/staff/check-ins") {
    if (!requirePermission(req, res, "checkins.create")) return;
    try {
      const input = await readJson(req);
      const event = store.events.find((item) => item.id === input.eventId && item.status === "open");
      if (!event) return send(res, 400, { error: "Choose an open event or tutorial center." });
      const pass = store.resolveCheckInPass(input.code);
      const decoded = verifyCheckInCredential(pass.credential);
      const profile = store.profiles.find((item) => item.id === decoded.profileId && item.status === "active");
      if (!profile) return send(res, 400, { error: "Student profile is unavailable." });
      const result = store.addAttendance({
        eventId: event.id,
        profileId: profile.id,
        checkedInBy: "student-retention-staff",
        method: "secure_code"
      });
      return send(res, result.duplicate ? 200 : 201, {
        ...result,
        student: { displayName: profile.displayName, verificationStatus: profile.verificationStatus },
        event: { name: event.name, location: event.location }
      });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/staff/attendance") {
    if (!requirePermission(req, res, "attendance.read")) return;
    return send(res, 200, { attendance: store.staffAttendance() });
  }
  if (req.method === "GET" && url.pathname === "/api/knowledge") {
    const query = url.searchParams.get("q");
    const articles = query ? searchKnowledgeBase(query, store.articles, 10) : store.articles;
    return send(res, 200, { articles });
  }
  if (req.method === "POST" && url.pathname === "/api/conversations") {
    return send(res, 201, { conversation: store.createConversation() });
  }
  if (req.method === "POST" && url.pathname.match(/^\/api\/conversations\/[^/]+\/messages$/)) {
    const conversationId = url.pathname.split("/")[3];
    const { message } = await readJson(req);
    if (!message || message.length > 1000) return send(res, 400, { error: "Message must be between 1 and 1,000 characters." });
    store.addMessage(conversationId, "student", message);
    const result = buildAnswer(message, store.articles);
    const saved = store.addMessage(conversationId, "assistant", result.answer, result);
    return send(res, 201, { message: saved, ...result });
  }
  if (req.method === "POST" && url.pathname === "/api/feedback") {
    const input = await readJson(req);
    if (!input.messageId || !["helpful", "not_helpful"].includes(input.rating)) return send(res, 400, { error: "Valid messageId and rating required." });
    return send(res, 201, { feedback: store.addFeedback(input) });
  }
  if (req.method === "POST" && url.pathname === "/api/escalations") {
    const input = await readJson(req);
    const allowedMethods = ["teams", "email", "follow_up", "office_hours"];
    if (!input.question || !input.escalationReason || !allowedMethods.includes(input.preferredContactMethod)) {
      return send(res, 400, { error: "Question, escalation reason, and valid preferred contact method are required." });
    }
    return send(res, 201, {
      escalation: store.addEscalation({
        ...input,
        studentId: null,
        studentEmail: null,
        responsibleOffice: studentRetentionSupport.office,
        teamsLinkClicked: input.preferredContactMethod === "teams"
      })
    });
  }
  if (req.method === "GET" && url.pathname === "/api/admin/escalations") {
    if (!requirePermission(req, res, "retention.manage")) return;
    return send(res, 200, { escalations: store.escalations });
  }
  if (req.method === "POST" && url.pathname === "/api/admin/knowledge") {
    if (!requirePermission(req, res, "knowledge.manage")) return;
    const input = await readJson(req);
    if (!input.title || !input.category || !input.content || !input.sourceUrl || !input.office || !input.contactUrl) {
      return send(res, 400, { error: "Title, category, content, source, office, and contact are required." });
    }
    return send(res, 201, { article: store.saveArticle(input) });
  }
  return send(res, 404, { error: "Not found." });
}

function staticFile(res, pathname) {
  const cleanPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.normalize(path.join(publicDir, cleanPath));
  if (!file.startsWith(publicDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".jpeg": "image/jpeg", ".jpg": "image/jpeg" };
  send(res, 200, fs.readFileSync(file), types[path.extname(file)] || "application/octet-stream");
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (process.env.NEST_PUBLIC_DEMO === "true" && ["/admin.html", "/admin.js", "/checkin.html", "/checkin.js", "/staff.html", "/staff.js"].includes(url.pathname)) {
      return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }
    if (!staticFile(res, url.pathname)) send(res, 404, "Not found", "text/plain; charset=utf-8");
  } catch (error) {
    send(res, 500, { error: "Unexpected server error.", detail: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
});

if (require.main === module) server.listen(port, () => {
  console.log(`Nest Concierge running at http://localhost:${port}`);
  console.log(`Local data persists at ${dataFile}`);
});

module.exports = { server, store };
