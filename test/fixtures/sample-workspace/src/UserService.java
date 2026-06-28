/**
 * 用户服务实现
 */
public class UserService {

    private String userId;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public UserData findById(String id) {
        try {
            return loadUser(id);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
        return null;
    }

    private UserData loadUser(String id) {
        return new UserData(id);
    }
}

class UserData {
    private String id;

    public UserData(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }
}
