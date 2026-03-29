package com.cinema.seatmanagement.util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;

@Component
@Slf4j
public class QrCodeGenerator {

    private static final int QR_WIDTH  = 300;
    private static final int QR_HEIGHT = 300;

    /**
     * QRCodeWriter is thread-safe (stateless) — one instance shared across all calls.
     * The original created new QRCodeWriter() on every invocation, allocating a new
     * object on every booking and check-in — needless GC pressure under load.
     */
    private static final QRCodeWriter WRITER = new QRCodeWriter();

    /**
     * Hints are identical on every call — computed once at class load.
     * EnumMap is faster than HashMap for enum-keyed maps.
     * The original allocated a new HashMap on every call.
     */
    private static final Map<EncodeHintType, Object> HINTS =
            new EnumMap<>(EncodeHintType.class);

    static {
        HINTS.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        HINTS.put(EncodeHintType.MARGIN, 2);
    }

    /**
     * Generates a Base64-encoded PNG QR code from the given content string.
     * Used by BookingServiceImpl to embed the QR in the booking confirmation response
     * and the confirmation email.
     *
     * @param content the string to encode (typically the booking code "BK-XXXXXXXX")
     * @return Base64 string suitable for data:image/png;base64,... in HTML emails
     */
    public String generateQrCodeBase64(String content) {
        return Base64.getEncoder().encodeToString(generateQrCodeBytes(content));
    }

    /**
     * Generates raw PNG bytes for the QR code.
     * Used when writing QR images to disk or attaching to multipart emails.
     */
    public byte[] generateQrCodeBytes(String content) {
        try {
            BitMatrix bitMatrix = WRITER.encode(content, BarcodeFormat.QR_CODE,
                    QR_WIDTH, QR_HEIGHT, HINTS);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();

        } catch (WriterException | IOException e) {
            log.error("QR code generation failed for content: {}", content, e);
            throw new RuntimeException("QR code generation failed", e);
        }
    }
}