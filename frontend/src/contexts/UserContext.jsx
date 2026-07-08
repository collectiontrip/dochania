import { 
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";


import userService from "../services/userService";

const UserContext = createContext();

export const UserProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const loadUser = useCallback(async () => {
        
        const token = localStorage.getItem("accessToken");

        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const response = 
                await userService.getCurrentUser();
            
            setUser(response.data);
        
        } catch (error) {

            console.error(error);
            setUser(null);
        
        } finally {
            
            setLoading(false);
        }

    }, []);

    const logout = () => {

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user_id");

        setUser(null);

    };

    useEffect(() => {

        loadUser();
    }, [loadUser]);

    return (

        <UserContext.Provider
            value={{
                user,
                setUser,
                loadUser,
                logout,
                loading,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () =>
    useContext(UserContext);