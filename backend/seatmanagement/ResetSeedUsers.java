import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class ResetSeedUsers {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/cinemadb";
        String user = "postgres";
        String password = "1234";

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String adminHash = encoder.encode("admin123");
        String customerHash = encoder.encode("customer123");

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            printUsers(conn, "Before reset");

            updateUser(conn, "admin@cinema.com", "System Admin", "ADMIN", adminHash);
            updateUser(conn, "customer@test.com", "Test Customer", "CUSTOMER", customerHash);

            printUsers(conn, "After reset");

            System.out.println("Admin login reset to: admin@cinema.com / admin123");
            System.out.println("Customer login reset to: customer@test.com / customer123");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void updateUser(Connection conn, String email, String fullName, String role, String passwordHash) throws Exception {
        String sql = """
            INSERT INTO users (email, password_hash, full_name, role, is_active)
            VALUES (?, ?, ?, ?, true)
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                is_active = true
            """;

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email);
            ps.setString(2, passwordHash);
            ps.setString(3, fullName);
            ps.setString(4, role);
            ps.executeUpdate();
        }
    }

    private static void printUsers(Connection conn, String title) throws Exception {
        System.out.println("=== " + title + " ===");
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id, email, role, is_active FROM users ORDER BY id")) {
            while (rs.next()) {
                System.out.printf("%d | %s | %s | active=%s%n",
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("role"),
                        rs.getBoolean("is_active"));
            }
        }
    }
}
