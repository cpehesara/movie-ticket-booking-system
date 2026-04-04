/**
 * TrackingEvent — published by the backend to /topic/tracking/{showtimeId}
 * whenever a customer scans at the door (DOOR_SCANNED) or confirms at their
 * physical seat (SEATED).
 *
 * Consumed by LiveTrackingPage.tsx via wsService.subscribeTracking().
 */
export type TrackingEventType = 'DOOR_SCANNED' | 'SEATED';

export interface TrackingEvent {
  /** DOOR_SCANNED = customer entered hall; SEATED = customer at their seat */
  eventType: TrackingEventType;

  /** e.g. "BK-A1B2C3D4" */
  bookingCode: string;

  /** Full name from the User entity */
  customerName: string;

  /** Movie title for this showtime */
  movieTitle: string;

  /** All seat labels in this booking, e.g. ["A1", "A2"] */
  seats: string[];

  /**
   * For SEATED events: the specific seat the customer just confirmed.
   * For DOOR_SCANNED events: null (customer is walking, not yet at a seat).
   */
  seatLabel: string | null;

  /** ISO 8601 datetime string from backend LocalDateTime.toString() */
  timestamp: string;
}