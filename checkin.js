const { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } = require("node:crypto");

const checkInSecret = process.env.CHECKIN_SIGNING_SECRET || randomBytes(32).toString("hex");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sign(value) {
  return createHmac("sha256", checkInSecret).update(value).digest("base64url");
}

function signaturesMatch(expected, received) {
  const left = Buffer.from(expected || "");
  const right = Buffer.from(received || "");
  return left.length === right.length && timingSafeEqual(left, right);
}

function createProvisionalProfile(input) {
  const displayName = String(input.displayName || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  if (displayName.length < 2 || displayName.length > 100) throw new Error("Enter your name.");
  if (!/^[^@\s]+@tougaloo\.edu$/i.test(email)) throw new Error("Use your Tougaloo email address.");
  const profileKey = randomBytes(24).toString("base64url");
  return {
    profile: {
      id: randomUUID(),
      displayName,
      email,
      profileKeyHash: hash(profileKey),
      verificationStatus: "unverified",
      status: "active",
      createdAt: new Date().toISOString()
    },
    profileKey
  };
}

function authorizeProfile(profile, profileKey) {
  if (!profile || !profileKey) return false;
  const received = Buffer.from(hash(profileKey));
  const expected = Buffer.from(profile.profileKeyHash);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function issueCheckInCredential(profile, ttlMinutes = 5) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const payload = Buffer.from(JSON.stringify({
    profileId: profile.id,
    expiresAt: expiresAt.toISOString(),
    nonce: randomBytes(8).toString("hex")
  })).toString("base64url");
  return { credential: `${payload}.${sign(payload)}`, expiresAt: expiresAt.toISOString() };
}

function verifyCheckInCredential(credential) {
  const [payload, signature, extra] = String(credential || "").split(".");
  if (!payload || !signature || extra || !signaturesMatch(sign(payload), signature)) throw new Error("Check-in code is invalid.");
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Check-in code is invalid.");
  }
  const expiresAt = new Date(decoded.expiresAt);
  if (!decoded.profileId || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw new Error("Check-in code has expired.");
  return decoded;
}

function createEvent(input) {
  const name = String(input.name || "").trim();
  const location = String(input.location || "").trim();
  if (!name || !location) throw new Error("Event name and location are required.");
  return {
    id: randomUUID(),
    name,
    location,
    eventType: input.eventType === "event" ? "event" : "tutorial_center",
    startsAt: input.startsAt || new Date().toISOString(),
    status: "open",
    createdBy: "student-retention-staff",
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  authorizeProfile,
  createEvent,
  createProvisionalProfile,
  hash,
  issueCheckInCredential,
  verifyCheckInCredential
};
