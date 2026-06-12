import type { AlertEvent, IncidentTimelineEvent } from '../../types/detection';

export type GroupedIncident = {
  id: string;
  cameraId: string;
  title: string;
  description: string;
  riskLevel: IncidentTimelineEvent['riskLevel'];
  startAt: string;
  endAt: string;
  active: boolean;
  eventCount: number;
  humanAtRisk: boolean;
  snapshotUrl?: string | null;
  linkedAlertIds: string[];
  events: IncidentTimelineEvent[];
};

export type GroupedAlertIncident = {
  id: string;
  cameraId: string;
  title: string;
  message: string;
  severity: AlertEvent['severity'];
  status: AlertEvent['status'];
  startAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  snapshotUrl?: string | null;
  timelineIncident?: GroupedIncident;
  alerts: AlertEvent[];
};

const riskWeight: Record<IncidentTimelineEvent['riskLevel'], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function groupIncidentTimeline(
  events: IncidentTimelineEvent[],
  alerts: AlertEvent[] = [],
): GroupedIncident[] {
  const alertsByIncident = new Map<string, AlertEvent[]>();
  for (const alert of alerts) {
    if (!alert.incidentId) continue;
    const list = alertsByIncident.get(alert.incidentId) ?? [];
    list.push(alert);
    alertsByIncident.set(alert.incidentId, list);
  }

  const grouped = new Map<string, IncidentTimelineEvent[]>();
  const sortedEvents = [...events].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  const activeIncidentByCamera = new Map<string, string>();

  for (const event of sortedEvents) {
    const incidentId = getIncidentId(event, activeIncidentByCamera);
    const list = grouped.get(incidentId) ?? [];
    list.push(event);
    grouped.set(incidentId, list);
  }

  return [...grouped.entries()]
    .map(([incidentId, incidentEvents]) => {
      const sortedAsc = [...incidentEvents].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      );
      const sortedDesc = [...sortedAsc].reverse();
      const primary = sortedDesc[0];
      const highestRisk = sortedAsc.reduce(
        (best, current) => (riskWeight[current.riskLevel] > riskWeight[best.riskLevel] ? current : best),
        sortedAsc[0],
      );
      const incidentAlerts = alertsByIncident.get(incidentId) ?? [];

      return {
        id: incidentId,
        cameraId: primary.cameraId,
        title: primary.title,
        description: primary.description,
        riskLevel: highestRisk.riskLevel,
        startAt: sortedAsc[0].createdAt,
        endAt: sortedDesc[0].createdAt,
        active: incidentAlerts.some((alert) => alert.status !== 'resolved'),
        eventCount: sortedAsc.length,
        humanAtRisk: sortedAsc.some((event) => event.humanAtRisk),
        snapshotUrl: primary.snapshotUrl ?? sortedAsc.find((event) => event.snapshotUrl)?.snapshotUrl ?? null,
        linkedAlertIds: incidentAlerts.map((alert) => alert.id),
        events: sortedDesc,
      } satisfies GroupedIncident;
    })
    .sort((left, right) => new Date(right.endAt).getTime() - new Date(left.endAt).getTime());
}

export function groupAlertsByIncident(
  alerts: AlertEvent[],
  timelineIncidents: GroupedIncident[] = [],
): GroupedAlertIncident[] {
  const timelineById = new Map(timelineIncidents.map((incident) => [incident.id, incident]));
  const activeIncidentByCamera = new Map<string, string>();
  for (const incident of [...timelineIncidents].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())) {
    activeIncidentByCamera.set(incident.cameraId, incident.id);
  }

  const grouped = new Map<string, AlertEvent[]>();
  for (const alert of alerts) {
    const incidentId = alert.incidentId || activeIncidentByCamera.get(alert.cameraId) || `${alert.cameraId}:${alert.label}`;
    const list = grouped.get(incidentId) ?? [];
    list.push(alert);
    grouped.set(incidentId, list);
  }

  return [...grouped.entries()]
    .map(([incidentId, incidentAlerts]) => {
      const sortedAsc = [...incidentAlerts].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      );
      const sortedDesc = [...sortedAsc].reverse();
      const primary = sortedDesc[0];
      const highestSeverity = sortedAsc.reduce(
        (best, current) => (severityWeight[current.severity] > severityWeight[best.severity] ? current : best),
        sortedAsc[0],
      );
      const timelineIncident = timelineById.get(incidentId);

      return {
        id: incidentId,
        cameraId: primary.cameraId,
        title: highestSeverity.title,
        message: highestSeverity.message,
        severity: highestSeverity.severity,
        status: sortedDesc.some((alert) => alert.status === 'open') ? 'open' : sortedDesc[0].status,
        startAt: sortedAsc[0].createdAt,
        lastSeenAt: sortedDesc.reduce(
          (latest, alert) => new Date(alert.lastSeenAt).getTime() > new Date(latest).getTime() ? alert.lastSeenAt : latest,
          sortedDesc[0].lastSeenAt,
        ),
        occurrenceCount: sortedAsc.reduce((sum, alert) => sum + alert.occurrenceCount, 0),
        snapshotUrl: highestSeverity.snapshotUrl ?? sortedAsc.find((alert) => alert.snapshotUrl)?.snapshotUrl ?? timelineIncident?.snapshotUrl ?? null,
        timelineIncident,
        alerts: sortedDesc,
      } satisfies GroupedAlertIncident;
    })
    .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime());
}

const severityWeight: Record<AlertEvent['severity'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function getIncidentId(event: IncidentTimelineEvent, activeIncidentByCamera: Map<string, string>) {
  const metadataIncidentId = event.metadata.incidentId;
  if (typeof metadataIncidentId === 'string' && metadataIncidentId) {
    updateActiveIncident(event, metadataIncidentId, activeIncidentByCamera);
    return metadataIncidentId;
  }
  const emergencyIncidentId = event.metadata.emergencyEventId;
  if (typeof emergencyIncidentId === 'string' && emergencyIncidentId) {
    const previousState = event.metadata.previousState;
    const state = event.metadata.state;
    if (previousState && previousState !== 'monitoring') {
      const activeIncidentId = activeIncidentByCamera.get(event.cameraId);
      if (activeIncidentId) {
        updateActiveIncident(event, activeIncidentId, activeIncidentByCamera);
        return activeIncidentId;
      }
    }
    updateActiveIncident(event, emergencyIncidentId, activeIncidentByCamera);
    return emergencyIncidentId;
  }

  const eventTime = new Date(event.createdAt);
  const fiveMinuteBucket = Math.floor(eventTime.getTime() / (5 * 60 * 1000));
  return `${event.cameraId}:${event.riskLevel}:${fiveMinuteBucket}`;
}

function updateActiveIncident(
  event: IncidentTimelineEvent,
  incidentId: string,
  activeIncidentByCamera: Map<string, string>,
) {
  const state = event.metadata.state;
  const action = event.metadata.action;

  if (state === 'monitoring' || action === 'resolve') {
    activeIncidentByCamera.delete(event.cameraId);
    return;
  }

  if (event.eventType === 'emergency_transition' || event.eventType === 'operator_action') {
    activeIncidentByCamera.set(event.cameraId, incidentId);
  }
}
