const { randomUUID } = require("node:crypto");
const { retentionStaff } = require("./retention-staff");
const { tutoringSubjects } = require("./tutoring");

const appointmentTypes = [
  { id: "retention", label: "Student Retention Services", durationMinutes: 30 },
  { id: "eagle-assistant", label: "Eagle Assistant Tutoring", durationMinutes: 45 }
];

const providers = [
  ...retentionStaff.map((staff) => ({ id: staff.id, typeId: "retention", name: staff.name, role: staff.title })),
  { id: "eagle-assistant-team", typeId: "eagle-assistant", name: "Eagle Assistant assignment pending", role: "Peer Academic Support" }
];

const formats = ["in_person", "microsoft_teams"];
const retentionReasons = [
  { id: "academic-success-plan", label: "Academic Success Plan" },
  { id: "check-in", label: "Student Check-In" },
  { id: "course-trouble", label: "Course Trouble" },
  { id: "other", label: "Other General Support" }
];

function validateAppointment(input) {
  const type = appointmentTypes.find((item) => item.id === input.typeId);
  const provider = providers.find((item) => item.id === input.providerId && item.typeId === input.typeId);
  if (!type || !provider) throw new Error("Choose a valid appointment type and provider.");
  const reason = input.typeId === "retention"
    ? retentionReasons.find((item) => item.id === input.reasonId)
    : null;
  if (input.typeId === "retention" && !reason) throw new Error("Choose a reason for your Retention appointment.");
  const subject = input.typeId === "eagle-assistant"
    ? tutoringSubjects.find((item) => item.id === input.subjectId)
    : null;
  if (input.typeId === "eagle-assistant" && !subject) throw new Error("Choose an available tutoring subject.");
  if (!formats.includes(input.format)) throw new Error("Choose a valid meeting format.");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) throw new Error("Choose a future appointment time.");
  return { type, provider, reason, startsAt, subject };
}

function createAppointment(input) {
  const { type, provider, reason, startsAt, subject } = validateAppointment(input);
  return {
    id: randomUUID(),
    studentId: input.studentId || null,
    studentEmail: input.studentEmail || null,
    typeId: type.id,
    typeLabel: type.label,
    providerId: provider.id,
    providerName: provider.name,
    reasonId: reason?.id || null,
    reasonLabel: reason?.label || null,
    subjectId: subject?.id || null,
    subjectName: subject?.name || null,
    eagleAssistantStatus: subject?.eagleAssistantStatus || null,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + type.durationMinutes * 60_000).toISOString(),
    format: input.format,
    status: "requested",
    microsoft365SyncStatus: "pending_it_approval",
    microsoft365EventId: null,
    createdAt: new Date().toISOString()
  };
}

module.exports = { appointmentTypes, createAppointment, formats, providers, retentionReasons, tutoringSubjects, validateAppointment };
