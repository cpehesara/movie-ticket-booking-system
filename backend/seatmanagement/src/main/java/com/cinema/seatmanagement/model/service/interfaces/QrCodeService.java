package com.cinema.seatmanagement.model.service.interfaces;

/**
 * QrCodeService — generates and validates QR codes for two distinct purposes:
 *
 *  1. BOOKING QR  — ephemeral, created per booking, encodes:
 *       bookingId + showtimeId + userId + bookingCode + HMAC signature
 *     Used at the cinema door for check-in. One-time use per showtime.
 *
 *  2. SEAT QR     — permanent, created once per physical seat, encodes:
 *       seatId + screenId + seatLabel (e.g. "A-3") + HMAC signature
 *     Printed and stuck to each seat. Never changes. Used for final
 *     seating confirmation (LED turn-off trigger).
 *
 * Both QR codes are HMAC-SHA256 signed with a shared secret so the backend
 * can validate authenticity without a DB lookup in the fast path.
 */
public interface QrCodeService {

    /**
     * Generate a Base64-encoded PNG QR code image for a booking.
     * The QR payload encodes: BOOKING:{bookingCode}:{showtimeId}:{userId}:{hmac}
     *
     * @param bookingCode unique booking reference (e.g. "BK-20260401-X7K2")
     * @param showtimeId  the showtime being attended
     * @param userId      the customer's user ID
     * @return Base64 PNG string suitable for embedding in HTML/email as data URI
     */
    String generateBookingQrCode(String bookingCode, Long showtimeId, Long userId);

    /**
     * Generate a Base64-encoded PNG QR code for a physical seat (permanent).
     * The QR payload encodes: SEAT:{seatId}:{screenId}:{rowLabel}:{colNumber}:{hmac}
     *
     * Called once when a seat is created/configured; result stored in Seat.permanentQrCode.
     *
     * @param seatId    DB seat ID
     * @param screenId  DB screen ID
     * @param rowLabel  e.g. "A"
     * @param colNumber e.g. 3
     * @return Base64 PNG string
     */
    String generateSeatQrCode(Long seatId, Long screenId, String rowLabel, Integer colNumber);

    /**
     * Validate a QR payload string (decoded from a scanned QR).
     * Verifies the HMAC and returns a parsed result object.
     *
     * @param rawPayload the raw string encoded in the QR (not Base64 image)
     * @return QrValidationResult with type (BOOKING/SEAT) and parsed fields
     * @throws com.cinema.seatmanagement.exception.InvalidQrCodeException if invalid/tampered
     */
    QrValidationResult validateQrPayload(String rawPayload);

    /**
     * Build the raw QR payload string for a booking (without image generation).
     * Useful when the payload needs to be stored in DB (Booking.qrCodeData).
     */
    String buildBookingQrPayload(String bookingCode, Long showtimeId, Long userId);

    /**
     * Build the raw QR payload string for a permanent seat QR.
     * Useful when the payload needs to be stored in DB (Seat.permanentQrPayload).
     */
    String buildSeatQrPayload(Long seatId, Long screenId, String rowLabel, Integer colNumber);

    // ── Inner result class ─────────────────────────────────────────────────

    enum QrType { BOOKING, SEAT }

    class QrValidationResult {
        public final QrType type;

        // BOOKING fields
        public final String bookingCode;
        public final Long   showtimeId;
        public final Long   userId;

        // SEAT fields
        public final Long    seatId;
        public final Long    screenId;
        public final String  rowLabel;
        public final Integer colNumber;

        /** Private constructor — use static factories below */
        private QrValidationResult(QrType type,
                                   String bookingCode, Long showtimeId, Long userId,
                                   Long seatId, Long screenId, String rowLabel, Integer colNumber) {
            this.type = type;
            this.bookingCode = bookingCode;
            this.showtimeId  = showtimeId;
            this.userId      = userId;
            this.seatId      = seatId;
            this.screenId    = screenId;
            this.rowLabel    = rowLabel;
            this.colNumber   = colNumber;
        }

        public static QrValidationResult booking(String bookingCode, Long showtimeId, Long userId) {
            return new QrValidationResult(QrType.BOOKING, bookingCode, showtimeId, userId,
                    null, null, null, null);
        }

        public static QrValidationResult seat(Long seatId, Long screenId, String rowLabel, Integer colNumber) {
            return new QrValidationResult(QrType.SEAT, null, null, null,
                    seatId, screenId, rowLabel, colNumber);
        }
    }
}