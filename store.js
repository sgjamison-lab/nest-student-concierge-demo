const { randomInt, randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { seedArticles } = require("./seed");

class MemoryStore {
  constructor() {
    this.persistent = false;
    this.articles = structuredClone(seedArticles);
    this.conversations = [];
    this.messages = [];
    this.feedback = [];
    this.escalations = [];
    this.appointments = [];
    this.profiles = [];
    this.events = [];
    this.attendance = [];
    this.checkInPasses = [];
    this.userRoles = [];
  }

  changed() {}

  createConversation() {
    const conversation = { id: randomUUID(), createdAt: new Date().toISOString(), status: "open" };
    this.conversations.push(conversation);
    this.changed();
    return conversation;
  }

  addMessage(conversationId, role, content, metadata = {}) {
    const message = { id: randomUUID(), conversationId, role, content, metadata, createdAt: new Date().toISOString() };
    this.messages.push(message);
    this.changed();
    return message;
  }

  addFeedback(input) {
    const feedback = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    this.feedback.push(feedback);
    this.changed();
    return feedback;
  }

  addEscalation(input) {
    const escalation = {
      id: randomUUID(),
      conversationId: input.conversationId || null,
      studentId: input.studentId || null,
      studentEmail: input.studentEmail || null,
      question: input.question,
      escalationReason: input.escalationReason,
      preferredContactMethod: input.preferredContactMethod,
      teamsLinkClicked: Boolean(input.teamsLinkClicked),
      responsibleOffice: input.responsibleOffice,
      status: "new",
      assignedTo: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };
    this.escalations.push(escalation);
    this.changed();
    return escalation;
  }

  addAppointment(appointment) {
    this.appointments.push(appointment);
    this.changed();
    return appointment;
  }

  updateAppointmentStatus(id, status) {
    const appointment = this.appointments.find((item) => item.id === id);
    if (!appointment) throw new Error("Appointment request not found.");
    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    this.changed();
    return appointment;
  }

  updateEscalationStatus(id, status) {
    const escalation = this.escalations.find((item) => item.id === id);
    if (!escalation) throw new Error("Follow-up request not found.");
    escalation.status = status;
    escalation.assignedTo = status === "assigned" ? "student-retention-staff" : escalation.assignedTo;
    escalation.resolvedAt = ["resolved", "closed"].includes(status) ? new Date().toISOString() : null;
    this.changed();
    return escalation;
  }

  addProfile(profile) {
    this.profiles.push(profile);
    this.changed();
    return profile;
  }

  addCheckInPass(profileId, credential, expiresAt) {
    this.checkInPasses = this.checkInPasses.filter((item) => new Date(item.expiresAt) > new Date());
    let code;
    do code = String(randomInt(100000, 1000000));
    while (this.checkInPasses.some((item) => item.code === code));
    const pass = { code, profileId, credential, expiresAt };
    this.checkInPasses.push(pass);
    return { code, expiresAt };
  }

  resolveCheckInPass(code) {
    const pass = this.checkInPasses.find((item) => item.code === String(code || "").trim());
    if (!pass || new Date(pass.expiresAt) <= new Date()) throw new Error("Check-in code is invalid or expired.");
    return pass;
  }

  addEvent(event) {
    this.events.push(event);
    this.changed();
    return event;
  }

  closeEvent(id) {
    const event = this.events.find((item) => item.id === id);
    if (!event) throw new Error("Check-in session not found.");
    event.status = "closed";
    this.changed();
    return event;
  }

  staffAttendance() {
    return this.attendance.map((item) => {
      const profile = this.profiles.find((candidate) => candidate.id === item.profileId);
      const event = this.events.find((candidate) => candidate.id === item.eventId);
      return {
        id: item.id,
        checkedInAt: item.checkedInAt,
        method: item.method,
        student: profile ? { displayName: profile.displayName, verificationStatus: profile.verificationStatus } : null,
        event: event ? { name: event.name, location: event.location, eventType: event.eventType } : null
      };
    });
  }

  addAttendance(input) {
    const duplicate = this.attendance.find((item) => item.eventId === input.eventId && item.profileId === input.profileId);
    if (duplicate) return { attendance: duplicate, duplicate: true };
    const attendance = { id: randomUUID(), ...input, checkedInAt: new Date().toISOString() };
    this.attendance.push(attendance);
    this.changed();
    return { attendance, duplicate: false };
  }

  attendanceForProfile(profileId) {
    return this.attendance
      .filter((item) => item.profileId === profileId)
      .map((item) => {
        const event = this.events.find((candidate) => candidate.id === item.eventId);
        return {
          id: item.id,
          checkedInAt: item.checkedInAt,
          event: event ? { name: event.name, location: event.location, eventType: event.eventType, startsAt: event.startsAt } : null
        };
      });
  }

  assignUserRole(input) {
    const existing = this.userRoles.find((item) => item.userSubject === input.userSubject);
    const assignment = { userSubject: input.userSubject, role: input.role, assignedBy: input.assignedBy, updatedAt: new Date().toISOString() };
    if (existing) Object.assign(existing, assignment);
    else this.userRoles.push({ ...assignment, assignedAt: assignment.updatedAt });
    this.changed();
    return existing || this.userRoles.at(-1);
  }

  saveArticle(input) {
    const article = {
      id: input.id || randomUUID(),
      title: input.title,
      category: input.category,
      summary: input.summary || "",
      content: input.content,
      sourceUrl: input.sourceUrl,
      office: input.office,
      contactUrl: input.contactUrl,
      status: input.status === "published" ? "published" : "draft",
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    const index = this.articles.findIndex((item) => item.id === article.id);
    if (index >= 0) this.articles[index] = article;
    else this.articles.unshift(article);
    this.changed();
    return article;
  }
}

class PersistentStore extends MemoryStore {
  constructor(dataFile) {
    super();
    this.persistent = true;
    this.dataFile = path.resolve(dataFile);
    this.backupFile = `${this.dataFile}.bak`;
    this.load();
  }

  collections() {
    return {
      articles: this.articles,
      conversations: this.conversations,
      messages: this.messages,
      feedback: this.feedback,
      escalations: this.escalations,
      appointments: this.appointments,
      profiles: this.profiles,
      events: this.events,
      attendance: this.attendance,
      userRoles: this.userRoles
    };
  }

  loadFile(file) {
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!parsed || parsed.version !== 1 || !parsed.data) throw new Error("Unsupported local data format.");
    return parsed.data;
  }

  load() {
    let data;
    let recoveredFromBackup = false;
    try {
      data = this.loadFile(this.dataFile);
    } catch (error) {
      console.error(`Could not read local data file: ${error.message}`);
      try {
        data = this.loadFile(this.backupFile);
        recoveredFromBackup = true;
        console.error("Recovered local data from backup.");
      } catch (backupError) {
        throw new Error(`Local data and backup are unreadable: ${backupError.message}`);
      }
    }
    if (!data) {
      this.persist();
      return;
    }
    for (const key of Object.keys(this.collections())) {
      if (Array.isArray(data[key])) this[key] = data[key];
    }
    const existingArticleIds = new Set(this.articles.map((article) => article.id));
    for (const article of seedArticles) {
      if (!existingArticleIds.has(article.id)) this.articles.push(structuredClone(article));
    }
    if (recoveredFromBackup && fs.existsSync(this.dataFile)) fs.rmSync(this.dataFile);
    this.persist();
  }

  persist() {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    const temporaryFile = `${this.dataFile}.${process.pid}.tmp`;
    const payload = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: this.collections() }, null, 2);
    fs.writeFileSync(temporaryFile, payload, { encoding: "utf8", mode: 0o600 });
    if (fs.existsSync(this.dataFile)) {
      fs.copyFileSync(this.dataFile, this.backupFile);
      fs.rmSync(this.dataFile);
    }
    fs.renameSync(temporaryFile, this.dataFile);
  }

  changed() {
    this.persist();
  }
}

module.exports = { MemoryStore, PersistentStore };
