import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class PrintUsers {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/cinema_db";
        String user = "postgres";
        String password = "Hello@3126";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id, email, role FROM users")) {
            
            while(rs.next()) {
                System.out.println(rs.getInt("id") + " | " + rs.getString("email") + " | " + rs.getString("role"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
