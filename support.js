const studentRetentionSupport = {
  office: "Student Retention Services",
  email: process.env.STUDENT_RETENTION_EMAIL || "retaintheloo@tougaloo.edu",
  location: process.env.STUDENT_RETENTION_LOCATION || "Galloway Hall, rooms 226 and 230",
  officeHours: process.env.STUDENT_RETENTION_HOURS || "Monday-Friday, 8:00 a.m.-5:00 p.m.",
  officeHoursUrl: process.env.STUDENT_RETENTION_HOURS_URL || "/#retention-staff"
};

studentRetentionSupport.teamsUrl =
  `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(studentRetentionSupport.email)}`;
studentRetentionSupport.emailUrl = `mailto:${studentRetentionSupport.email}`;

module.exports = { studentRetentionSupport };
