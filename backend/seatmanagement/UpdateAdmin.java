
import java.sql.*;

public class UpdateAdmin {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:postgresql://localhost:5432/cinema_db";
        String user = "postgres";
        String password = "Hello@3126";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            int updated = stmt.executeUpdate("UPDATE users SET role = 'ADMIN'");
            System.out.println("Updated " + updated + " users to ADMIN.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

