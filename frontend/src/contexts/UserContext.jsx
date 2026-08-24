import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";


import userService from "../services/userService";


const UserContext =
    createContext();


export const UserProvider = ({
    children,
}) => {

    const [
        user,
        setUser,
    ] = useState(null);


    const [
        loading,
        setLoading,
    ] = useState(true);


    // ============================================================
    // GLOBAL NOTIFICATION
    // ============================================================

    const [
        notification,
        setNotification,
    ] = useState(null);


    // ============================================================
    // LOAD CURRENT USER
    // ============================================================

    const loadUser =
        useCallback(
            async () => {

                const token =
                    localStorage.getItem(
                        "accessToken",
                    );


                if (!token) {

                    setUser(null);
                    setLoading(false);

                    return;
                }


                try {

                    const response =
                        await userService.getCurrentUser();


                    setUser(
                        response.data,
                    );

                } catch (error) {

                    console.error(
                        "Failed to load user:",
                        error,
                    );

                    setUser(null);

                } finally {

                    setLoading(false);

                }

            },
            [],
        );


    // ============================================================
    // SHOW NOTIFICATION
    // ============================================================

    const showNotification =
        useCallback(
            (
                message,
                type = "success",
                duration = 3000,
            ) => {

                setNotification({
                    message,
                    type,
                });


                if (duration > 0) {

                    setTimeout(() => {

                        setNotification(null);

                    }, duration);

                }

            },
            [],
        );


    // ============================================================
    // CLEAR NOTIFICATION
    // ============================================================

    const clearNotification =
        useCallback(
            () => {

                setNotification(null);

            },
            [],
        );


    // ============================================================
    // LOGOUT
    // ============================================================

    const logout = () => {

        localStorage.removeItem(
            "accessToken",
        );

        localStorage.removeItem(
            "refreshToken",
        );

        localStorage.removeItem(
            "user_id",
        );

        localStorage.removeItem(
            "privateKey",
        );


        setUser(null);

    };


    // ============================================================
    // INITIAL USER LOAD
    // ============================================================

    useEffect(() => {

        loadUser();

    }, [
        loadUser,
    ]);


    // ============================================================
    // CONTEXT
    // ============================================================

    return (

        <UserContext.Provider
            value={{
                user,
                setUser,

                loadUser,

                logout,

                loading,

                notification,
                showNotification,
                clearNotification,
            }}
        >

            {children}

        </UserContext.Provider>

    );

};


export const useUser = () =>
    useContext(UserContext);