const roles = {
  super_user: {
    label: "Super User",
    permissions: ["system.manage", "roles.manage", "knowledge.manage", "retention.manage", "events.manage", "checkins.create", "attendance.read", "reports.read"]
  },
  admin: {
    label: "Admin",
    permissions: ["knowledge.manage", "retention.manage", "events.manage", "checkins.create", "attendance.read", "reports.read"]
  },
  staff: {
    label: "Staff",
    permissions: ["retention.manage", "events.manage", "checkins.create", "attendance.read"]
  },
  student_staff: {
    label: "Student Staff",
    permissions: ["events.read", "checkins.create"]
  },
  student: {
    label: "Student",
    permissions: ["student.use", "own_data.read"]
  }
};

function hasPermission(role, permission) {
  return Boolean(roles[role]?.permissions.includes(permission));
}

function publicRoles() {
  return Object.entries(roles).map(([id, value]) => ({ id, label: value.label, permissions: value.permissions }));
}

function isRole(value) {
  return Object.hasOwn(roles, value);
}

module.exports = { hasPermission, isRole, publicRoles, roles };
