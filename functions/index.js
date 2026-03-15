const admin = require("firebase-admin");
const {DateTime} = require("luxon");
const {setGlobalOptions, logger} = require("firebase-functions/v2");
const {onDocumentCreated, onDocumentUpdated, onDocumentWritten} =
  require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();
const fieldValue = admin.firestore.FieldValue;

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

const COLLECTIONS = {
  caregiverCheckins: "caregiverCheckins",
  dailyTasks: "dailyTasks",
  medicationCompletions: "medicationCompletions",
  medications: "medications",
  patients: "patients",
  patientAlerts: "patientAlerts",
  patientLocations: "patientLocations",
  patientSafeZones: "patientSafeZones",
  users: "users",
};

const DEFAULT_COMPLETION_WINDOW_MINUTES = 30;
const OUTSIDE_SAFE_ZONE_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

function getCompletionWindowMinutes(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_COMPLETION_WINDOW_MINUTES;
  }

  return numericValue;
}

function getMedicationOccurrenceLimit(frequency) {
  if (frequency === "Once daily") {
    return 1;
  }

  if (frequency === "Twice daily") {
    return 2;
  }

  if (frequency === "Three times daily") {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

function buildMedicationCompletionId(
  patientId,
  medicationId,
  dateKey,
  scheduledTime,
) {
  return [
    String(patientId || "").trim(),
    String(medicationId || "").trim(),
    String(dateKey || "").trim(),
    encodeURIComponent(String(scheduledTime || "").trim()),
  ].join("__");
}

function getCandidateDateKeys() {
  const now = DateTime.utc();

  return Array.from(new Set([
    now.minus({days: 1}).toFormat("yyyy-MM-dd"),
    now.toFormat("yyyy-MM-dd"),
    now.plus({days: 1}).toFormat("yyyy-MM-dd"),
  ]));
}

function parseScheduledDateTime(dateKey, formattedTime, timeZone) {
  if (!dateKey || !formattedTime) {
    return null;
  }

  const dateTime = DateTime.fromFormat(
    `${dateKey} ${formattedTime}`,
    "yyyy-MM-dd h:mm a",
    {zone: timeZone || "UTC"},
  );

  return dateTime.isValid ? dateTime : null;
}

function getTaskScheduledAtMs(task) {
  if (Number.isFinite(task.scheduledAtMs)) {
    return Number(task.scheduledAtMs);
  }

  const scheduledDateTime = parseScheduledDateTime(
    task.dateKey,
    task.time,
    task.timeZone,
  );

  return scheduledDateTime ? scheduledDateTime.toMillis() : null;
}

function medicationOccursOnDate(medication, dateTime) {
  const frequency = medication.frequency || "";
  const anchorDate = Number.isFinite(medication.createdAtMs) ?
    DateTime.fromMillis(Number(medication.createdAtMs), {
      zone: dateTime.zoneName,
    }).startOf("day") :
    dateTime.startOf("day");

  if (frequency === "Every other day") {
    const differenceInDays = Math.floor(
      dateTime.startOf("day").diff(anchorDate, "days").days,
    );

    return differenceInDays >= 0 && differenceInDays % 2 === 0;
  }

  if (frequency === "Weekly") {
    return dateTime.weekday === anchorDate.weekday;
  }

  if (frequency === "As needed") {
    return false;
  }

  return true;
}

function chunkItems(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function getPatientRecord(patientId) {
  if (!patientId) {
    return null;
  }

  const snapshot = await db.collection(COLLECTIONS.patients).doc(patientId).get();
  return snapshot.exists ? {id: snapshot.id, ...snapshot.data()} : null;
}

async function getPatientSafeZoneRecord(patientId) {
  if (!patientId) {
    return null;
  }

  const snapshot = await db.collection(COLLECTIONS.patientSafeZones)
    .doc(patientId)
    .get();
  return snapshot.exists ? {id: snapshot.id, ...snapshot.data()} : null;
}

async function getLatestCaregiverName(patientId) {
  if (!patientId) {
    return "";
  }

  const snapshot = await db.collection(COLLECTIONS.caregiverCheckins)
    .where("patientId", "==", patientId)
    .get();

  if (snapshot.empty) {
    return "";
  }

  return snapshot.docs
    .map((docSnapshot) => docSnapshot.data())
    .sort((left, right) =>
      Number(right.checkedInAtMs || 0) - Number(left.checkedInAtMs || 0))
    [0]?.caregiverName || "";
}

function isValidCoordinate(coordinate) {
  return Boolean(
    coordinate &&
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude),
  );
}

function getSafeZoneCenter(safeZone) {
  if (isValidCoordinate(safeZone?.center)) {
    return {
      latitude: Number(safeZone.center.latitude),
      longitude: Number(safeZone.center.longitude),
    };
  }

  const legacyVertices = Array.isArray(safeZone?.vertices) ?
    safeZone.vertices.filter(isValidCoordinate) :
    [];

  if (!legacyVertices.length) {
    return null;
  }

  return {
    latitude: legacyVertices.reduce((sum, vertex) => sum + vertex.latitude, 0) /
      legacyVertices.length,
    longitude: legacyVertices.reduce((sum, vertex) => sum + vertex.longitude, 0) /
      legacyVertices.length,
  };
}

function getDistanceInMeters(start, end) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(
    Math.sqrt(haversine),
    Math.sqrt(1 - haversine),
  );
}

async function getLinkedUsers(patientId, role) {
  const snapshot = await db.collection(COLLECTIONS.users)
    .where("linkedPatientId", "==", patientId)
    .get();

  return snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }))
    .filter((user) => user.role === role);
}

function getExpoPushTokens(users) {
  return Array.from(new Set(
    users
      .flatMap((user) => user.expoPushTokens || [])
      .map((token) => String(token || "").trim())
      .filter((token) => EXPO_TOKEN_PATTERN.test(token)),
  ));
}

async function sendExpoNotifications(tokens, payload) {
  const normalizedTokens = Array.from(new Set(tokens)).filter((token) => {
    return EXPO_TOKEN_PATTERN.test(String(token || "").trim());
  });

  if (!normalizedTokens.length) {
    return 0;
  }

  let deliveredCount = 0;

  for (const tokenChunk of chunkItems(normalizedTokens, 100)) {
    const messages = tokenChunk.map((token) => ({
      to: token,
      sound: "default",
      priority: "high",
      ...payload,
    }));

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error("Expo push API request failed", result);
      continue;
    }

    deliveredCount += Array.isArray(result.data) ? result.data.length : 0;
  }

  return deliveredCount;
}

async function notifyLinkedUsers(patientId, role, payload) {
  const users = await getLinkedUsers(patientId, role);
  const tokens = getExpoPushTokens(users);

  if (!tokens.length) {
    logger.info("No push tokens found for linked users", {patientId, role});
    return 0;
  }

  return sendExpoNotifications(tokens, payload);
}

exports.notifyPatientWhenTaskAssigned = onDocumentCreated(
  `${COLLECTIONS.dailyTasks}/{taskId}`,
  async (event) => {
    const task = event.data ? event.data.data() : null;

    if (!task?.patientId || !task?.title) {
      return;
    }

    await notifyLinkedUsers(task.patientId, "patient", {
      title: "New task assigned",
      body: `${task.title} at ${task.time || "today"}`,
      data: {
        category: "daily-task-assigned",
        patientId: String(task.patientId),
        taskId: String(event.params.taskId),
        taskTitle: String(task.title),
      },
    });

    await event.data.ref.set({
      assignmentNotificationSentAt: fieldValue.serverTimestamp(),
      assignmentNotificationSentAtMs: Date.now(),
    }, {merge: true});
  },
);

exports.notifyCaregiverWhenTaskCompleted = onDocumentUpdated(
  `${COLLECTIONS.dailyTasks}/{taskId}`,
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before?.status === "completed" || after?.status !== "completed") {
      return;
    }

    const patient = await getPatientRecord(after.patientId);
    const patientName = patient?.patientName || "Patient";

    await notifyLinkedUsers(after.patientId, "caregiver", {
      title: "Task completed",
      body: `${patientName} completed "${after.title || "a task"}".`,
      data: {
        category: "daily-task-completed",
        patientId: String(after.patientId || ""),
        taskId: String(event.params.taskId),
      },
    });

    await event.data.after.ref.set({
      completionNotificationSentAt: fieldValue.serverTimestamp(),
      completionNotificationSentAtMs: Date.now(),
    }, {merge: true});
  },
);

exports.notifyCaregiverWhenMedicationCompleted = onDocumentWritten(
  `${COLLECTIONS.medicationCompletions}/{completionId}`,
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;

    if (!after?.patientId || after?.status !== "completed") {
      return;
    }

    if (before?.status === "completed") {
      return;
    }

    const patient = await getPatientRecord(after.patientId);
    const patientName = patient?.patientName || "Patient";
    const medicationLabel = after.medicationName || "medication";

    await notifyLinkedUsers(after.patientId, "caregiver", {
      title: "Medication completed",
      body: `${patientName} confirmed ${medicationLabel} for ` +
        `${after.scheduledTime || "today"}.`,
      data: {
        category: "medication-completed",
        patientId: String(after.patientId || ""),
        medicationId: String(after.medicationId || ""),
        completionId: String(event.params.completionId),
      },
    });

    await event.data.after.ref.set({
      completionNotificationSentAt: fieldValue.serverTimestamp(),
      completionNotificationSentAtMs: Date.now(),
    }, {merge: true});
  },
);

exports.notifyCaregiverWhenPatientRequestsHelp = onDocumentCreated(
  `${COLLECTIONS.patientAlerts}/{alertId}`,
  async (event) => {
    const alertRecord = event.data ? event.data.data() : null;

    if (!alertRecord?.patientId) {
      return;
    }

    const patient = await getPatientRecord(alertRecord.patientId);
    const patientName = patient?.patientName || "Patient";
    const requestedNeeds = Array.isArray(alertRecord.requestedNeeds) ?
      alertRecord.requestedNeeds
        .map((need) => String(need || "").trim())
        .filter(Boolean) :
      [];
    const location =
      alertRecord.location &&
      Number.isFinite(alertRecord.location.latitude) &&
      Number.isFinite(alertRecord.location.longitude) ?
        {
          latitude: Number(alertRecord.location.latitude).toFixed(5),
          longitude: Number(alertRecord.location.longitude).toFixed(5),
        } :
        null;
    const body = alertRecord.message ||
      (requestedNeeds.length ?
        `${patientName} needs help with: ${requestedNeeds.join(", ")}.` :
        `${patientName} requested help getting home.`);

    await notifyLinkedUsers(alertRecord.patientId, "caregiver", {
      title: "Patient needs help",
      body,
      data: {
        category: "patient-help-request",
        patientId: String(alertRecord.patientId || ""),
        alertId: String(event.params.alertId || ""),
        requestedNeeds: requestedNeeds.join(", "),
        locationLatitude: location?.latitude || "",
        locationLongitude: location?.longitude || "",
      },
    });

    await event.data.ref.set({
      notificationSentAt: fieldValue.serverTimestamp(),
      notificationSentAtMs: Date.now(),
      updatedAt: fieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
    }, {merge: true});
  },
);

exports.notifyWhenPatientLeavesSafeZone = onDocumentWritten(
  `${COLLECTIONS.patientLocations}/{patientId}`,
  async (event) => {
    const location = event.data.after.exists ? event.data.after.data() : null;
    const patientId = String(event.params.patientId || "");

    if (!patientId || !isValidCoordinate(location)) {
      return;
    }

    const safeZone = await getPatientSafeZoneRecord(patientId);
    const safeZoneCenter = getSafeZoneCenter(safeZone);
    const zoneRadiusMeters = Number(safeZone?.radiusMeters || 50);

    if (!safeZone || !safeZoneCenter || !Number.isFinite(zoneRadiusMeters)) {
      return;
    }

    const patientCoordinate = {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    };
    const isInsideSafeZone =
      getDistanceInMeters(patientCoordinate, safeZoneCenter) <= zoneRadiusMeters;
    const previousMembership = String(safeZone.lastMembershipState || "");
    const nowMs = Date.now();
    const safeZoneRef = db.collection(COLLECTIONS.patientSafeZones).doc(patientId);

    if (isInsideSafeZone) {
      if (previousMembership !== "inside") {
        await safeZoneRef.set({
          lastMembershipState: "inside",
          lastInsideAtMs: nowMs,
          lastInsideAt: fieldValue.serverTimestamp(),
        }, {merge: true});
      }
      return;
    }

    const lastAlertMs = Number(safeZone.lastBoundaryAlertSentAtMs || 0);
    const shouldNotify =
      previousMembership !== "outside" ||
      (nowMs - lastAlertMs) >= OUTSIDE_SAFE_ZONE_ALERT_COOLDOWN_MS;

    if (shouldNotify) {
      const patient = await getPatientRecord(patientId);
      const patientName = patient?.patientName || "Patient";
      const caregiverName = await getLatestCaregiverName(patientId);
      const patientBody = caregiverName ?
        `Do you need help navigating? ${caregiverName} will call.` :
        "Do you need help navigating? Your caregiver will call.";
      const caregiverBody =
        `${patientName} has left the safe area. Call and make sure they are okay.`;

      await Promise.all([
        notifyLinkedUsers(patientId, "patient", {
          title: "Need help getting home?",
          body: patientBody,
          data: {
            category: "safe-zone-exit-patient",
            patientId,
          },
        }),
        notifyLinkedUsers(patientId, "caregiver", {
          title: "Patient left the safe area",
          body: caregiverBody,
          data: {
            category: "safe-zone-exit-caregiver",
            patientId,
          },
        }),
      ]);
    }

    await safeZoneRef.set({
      lastMembershipState: "outside",
      lastOutsideAtMs: nowMs,
      lastOutsideAt: fieldValue.serverTimestamp(),
      ...(shouldNotify ? {
        lastBoundaryAlertSentAtMs: nowMs,
        lastBoundaryAlertSentAt: fieldValue.serverTimestamp(),
      } : {}),
    }, {merge: true});
  },
);

async function processMissedDailyTasks(nowMs) {
  const candidateDateKeys = getCandidateDateKeys();
  const taskSnapshot = await db.collection(COLLECTIONS.dailyTasks)
    .where("dateKey", "in", candidateDateKeys)
    .get();

  for (const taskDoc of taskSnapshot.docs) {
    const task = taskDoc.data();
    const scheduledAtMs = getTaskScheduledAtMs(task);

    if (!scheduledAtMs) {
      continue;
    }

    if (task.status === "completed" || Number(task.completedAtMs)) {
      continue;
    }

    if (Number(task.missedNotificationSentAtMs)) {
      continue;
    }

    const windowMinutes = getCompletionWindowMinutes(task.scheduledWindowMinutes);

    if (nowMs < scheduledAtMs + (windowMinutes * 60 * 1000)) {
      continue;
    }

    const patient = await getPatientRecord(task.patientId);
    const patientName = patient?.patientName || "Patient";

    await notifyLinkedUsers(task.patientId, "caregiver", {
      title: "Missed task",
      body: `${patientName} has not confirmed "${task.title || "a task"}" ` +
        `scheduled for ${task.time || "today"}.`,
      data: {
        category: "daily-task-missed",
        patientId: String(task.patientId || ""),
        taskId: taskDoc.id,
      },
    });

    await taskDoc.ref.set({
      missedNotificationSentAt: fieldValue.serverTimestamp(),
      missedNotificationSentAtMs: nowMs,
      updatedAt: fieldValue.serverTimestamp(),
      updatedAtMs: nowMs,
    }, {merge: true});
  }
}

async function processMissedMedicationOccurrences(nowMs) {
  const medicationSnapshot = await db.collection(COLLECTIONS.medications).get();

  for (const medicationDoc of medicationSnapshot.docs) {
    const medication = medicationDoc.data();
    const timeZone = medication.timeZone || "UTC";
    const localNow = DateTime.fromMillis(nowMs, {zone: timeZone});

    if (!medicationOccursOnDate(medication, localNow)) {
      continue;
    }

    const scheduledTimes = Array.isArray(medication.scheduledTimes) ?
      medication.scheduledTimes :
      [];
    const dueTimes = scheduledTimes
      .slice(0, getMedicationOccurrenceLimit(medication.frequency));
    const windowMinutes = getCompletionWindowMinutes(
      medication.scheduledWindowMinutes,
    );
    const dateKey = localNow.toFormat("yyyy-MM-dd");

    for (const scheduledTime of dueTimes) {
      const occurrenceDateTime = parseScheduledDateTime(
        dateKey,
        scheduledTime,
        timeZone,
      );

      if (!occurrenceDateTime) {
        continue;
      }

      if (nowMs < occurrenceDateTime.toMillis() + (windowMinutes * 60 * 1000)) {
        continue;
      }

      const completionId = buildMedicationCompletionId(
        medication.patientId,
        medicationDoc.id,
        dateKey,
        scheduledTime,
      );
      const completionRef = db.collection(COLLECTIONS.medicationCompletions)
        .doc(completionId);
      const completionSnapshot = await completionRef.get();
      const completion = completionSnapshot.exists ? completionSnapshot.data() : {};

      if (completion.status === "completed" ||
          Number(completion.missedNotificationSentAtMs)) {
        continue;
      }

      const patient = await getPatientRecord(medication.patientId);
      const patientName = patient?.patientName || "Patient";
      const medicationName = medication.medicationName || "medication";

      await notifyLinkedUsers(medication.patientId, "caregiver", {
        title: "Missed medication",
        body: `${patientName} has not confirmed ${medicationName} ` +
          `scheduled for ${scheduledTime}.`,
        data: {
          category: "medication-missed",
          patientId: String(medication.patientId || ""),
          medicationId: medicationDoc.id,
          completionId,
        },
      });

      await completionRef.set({
        patientId: medication.patientId,
        medicationId: medicationDoc.id,
        medicationName,
        dateKey,
        scheduledTime,
        status: "missed",
        missedNotificationSentAt: fieldValue.serverTimestamp(),
        missedNotificationSentAtMs: nowMs,
        updatedAt: fieldValue.serverTimestamp(),
        updatedAtMs: nowMs,
      }, {merge: true});
    }
  }
}

exports.sendMissedScheduleNotifications = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "UTC",
  },
  async () => {
    const nowMs = Date.now();

    await processMissedDailyTasks(nowMs);
    await processMissedMedicationOccurrences(nowMs);

    logger.info("Missed schedule notification scan finished", {nowMs});
  },
);
