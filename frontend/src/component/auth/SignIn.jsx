import {
    useState,
} from "react";


import {
    useNavigate,
} from "react-router-dom";


import AxiosInstance from "./axiosInstance";


import {
    getUserId,
} from "../../services/authService";


import {
    useUser,
} from "../../contexts/UserContext";


import DeviceDetector from "device-detector-js";


import "./Login.css";


const Login = () => {

    const [
        username,
        setUsername,
    ] = useState("");


    const [
        password,
        setPassword,
    ] = useState("");


    const [
        loading,
        setLoading,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    const [
        success,
        setSuccess,
    ] = useState("");


    const navigate =
        useNavigate();


    const {
        loadUser,
    } = useUser();


    // ==========================================================
    // DEVICE NAME
    // ==========================================================

    const getDeviceName = () => {

        const detector =
            new DeviceDetector();


        const device =
            detector.parse(
                navigator.userAgent,
            );


        const ua =
            navigator.userAgent;


        console.log(
            "🧠 Full Device Data:",
            device,
        );


        // ------------------------------------------------------
        // DEVICE MODEL
        // ------------------------------------------------------

        if (
            device.device?.model
        ) {

            return (
                `${
                    device.device.brand || ""
                } ${
                    device.device.model
                }`
            ).trim();

        }


        // ------------------------------------------------------
        // DEVICE TYPE
        // ------------------------------------------------------

        if (
            device.device?.type
        ) {

            return device
                .device
                .type
                .toUpperCase();

        }


        // ------------------------------------------------------
        // ANDROID
        // ------------------------------------------------------

        if (
            /android/i.test(ua)
        ) {

            return "Android Device";

        }


        // ------------------------------------------------------
        // IPHONE
        // ------------------------------------------------------

        if (
            /iPhone/i.test(ua)
        ) {

            return "iPhone";

        }


        // ------------------------------------------------------
        // WINDOWS
        // ------------------------------------------------------

        if (
            /Windows/i.test(ua)
        ) {

            return "Windows PC";

        }


        // ------------------------------------------------------
        // MAC
        // ------------------------------------------------------

        if (
            /Mac/i.test(ua)
        ) {

            return "MacBook";

        }


        // ------------------------------------------------------
        // LINUX
        // ------------------------------------------------------

        if (
            /Linux/i.test(ua)
        ) {

            return "Linux Laptop";

        }


        return "Unknown Device";
    };


    // ==========================================================
    // DEVICE INFORMATION
    // ==========================================================

    const getDeviceInfo = () => {

        return {

            user_agent:
                navigator.userAgent,

            platform:
                navigator.platform,

            language:
                navigator.language,

            device_name:
                getDeviceName(),

        };

    };


    // ==========================================================
    // GENERATE RSA KEY PAIR
    // ==========================================================

    const generateKeyPair =
        async () => {

            console.log(
                "🔑 Generating RSA key pair...",
            );


            const keyPair =
                await window.crypto.subtle.generateKey(

                    {
                        name: "RSA-OAEP",
                        modulusLength: 2048,
                        publicExponent:
                            new Uint8Array(
                                [1, 0, 1],
                            ),
                        hash: "SHA-256",
                    },

                    true,

                    [
                        "encrypt",
                        "decrypt",
                    ],

                );


            // --------------------------------------------------
            // EXPORT PUBLIC KEY
            // --------------------------------------------------

            const publicKeyBuffer =
                await window.crypto.subtle.exportKey(
                    "spki",
                    keyPair.publicKey,
                );


            const publicKeyBase64 =
                btoa(
                    String.fromCharCode(
                        ...new Uint8Array(
                            publicKeyBuffer,
                        ),
                    ),
                );


            // --------------------------------------------------
            // EXPORT PRIVATE KEY
            // --------------------------------------------------

            const privateKeyJwk =
                await window.crypto.subtle.exportKey(
                    "jwk",
                    keyPair.privateKey,
                );


            // --------------------------------------------------
            // SAVE PRIVATE KEY
            // --------------------------------------------------

            localStorage.setItem(
                "privateKey",
                JSON.stringify(
                    privateKeyJwk,
                ),
            );


            console.log(
                "✅ Key pair generated",
            );


            return publicKeyBase64;

        };


    // ==========================================================
    // LOGIN SUBMIT
    // ==========================================================

    const handleSubmit =
        async (e) => {

            e.preventDefault();


            setError("");
            setSuccess("");
            setLoading(true);


            try {

                // ==================================================
                // LOGIN
                // ==================================================

                const res =
                    await AxiosInstance.post(
                        "/auth/jwt/create/",
                        {
                            username:
                                username.trim(),

                            password:
                                password.trim(),
                        },
                    );


                const {
                    access,
                    refresh,
                } = res.data;


                // ==================================================
                // SAVE JWT TOKENS
                // ==================================================

                localStorage.setItem(
                    "accessToken",
                    access,
                );


                localStorage.setItem(
                    "refreshToken",
                    refresh,
                );


                // ==================================================
                // GET USER ID
                // ==================================================

                const userId =
                    getUserId();


                if (userId) {

                    localStorage.setItem(
                        "user_id",
                        userId,
                    );

                }


                console.log(
                    "👤 Logged in user id:",
                    userId,
                );


                // ==================================================
                // GENERATE RSA KEYS
                // ==================================================

                const publicKey =
                    await generateKeyPair();


                // ==================================================
                // SAVE PUBLIC KEY
                // ==================================================

                await AxiosInstance.post(
                    "/users/save-public-key/",
                    {
                        public_key:
                            publicKey,
                    },
                );


                console.log(
                    "📤 Public key sent to server",
                );


                console.log(
                    "🔐 Private key stored locally",
                );


                // ==================================================
                // SAVE DEVICE
                // ==================================================

                const deviceInfo =
                    getDeviceInfo();


                console.log(
                    "📱 Device Info:",
                    deviceInfo,
                );


                try {

                    const deviceResponse =
                        await AxiosInstance.post(
                            "/users/save-device/",
                            {
                                device_info:
                                    deviceInfo,
                            },
                        );


                    console.log(
                        "📱 Device info saved:",
                        deviceResponse.data,
                    );

                } catch (
                    deviceError
                ) {

                    /*
                     * Device saving should not
                     * prevent successful login.
                     */

                    console.error(
                        "❌ Device save failed:",
                        deviceError.response?.data
                        || deviceError.message,
                    );

                }


                // ==================================================
                // IMPORTANT
                // UPDATE USER CONTEXT IMMEDIATELY
                // ==================================================

                await loadUser();


                // ==================================================
                // SUCCESS NOTIFICATION
                // ==================================================

                setSuccess(
                    "Login successful",
                );


                // ==================================================
                // NAVIGATE
                // ==================================================

                navigate(
                    "/home",
                    {
                        replace: true,
                    },
                );


            } catch (err) {

                console.error(
                    "❌ Login error:",
                    err.response?.data
                    || err,
                );


                const data =
                    err.response?.data;


                // ==================================================
                // ACCOUNT LOCKED
                // ==================================================

                if (
                    data?.locked_until
                ) {

                    setError(
                        data.detail
                        || "Your account is temporarily locked. Please try again later.",
                    );

                    return;
                }


                // ==================================================
                // WRONG PASSWORD
                // ==================================================

                if (
                    data?.remaining_attempts
                    !== undefined
                ) {

                    setError(
                        `${
                            data.detail
                        } ${
                            data.remaining_attempts
                        } attempt${
                            data.remaining_attempts === 1
                                ? ""
                                : "s"
                        } remaining.`,
                    );

                    return;
                }


                // ==================================================
                // INACTIVE ACCOUNT
                // ==================================================

                if (
                    data?.detail ===
                    "Your account is inactive. Please activate your account first."
                ) {

                    setError(
                        "Your account is inactive. Please activate your account first.",
                    );

                    return;
                }


                // ==================================================
                // INVALID USERNAME / PASSWORD
                // ==================================================

                if (
                    err.response?.status ===
                    400
                ) {

                    setError(
                        data?.detail
                        || "Invalid username or password.",
                    );

                    return;
                }


                // ==================================================
                // SERVER ERROR
                // ==================================================

                setError(
                    "Server not reachable. Please try again later.",
                );

            } finally {

                setLoading(false);

            }

        };


    // ==========================================================
    // JSX
    // ==========================================================

    return (

        <div className="login-page">

            {/* ==================================================
                SUCCESS NOTIFICATION
            ================================================== */}

            {
                success
                && (

                    <div
                        className="login-success-notification"
                        role="status"
                        aria-live="polite"
                    >

                        <span>
                            ✓
                        </span>

                        <span>
                            {
                                success
                            }
                        </span>

                    </div>

                )
            }


            <div className="login-card">

                <div className="login-header">

                    <h2 className="login-title">
                        Welcome Back
                    </h2>


                    <p className="login-subtitle">
                        Sign in to continue to MediaApp
                    </p>

                </div>


                <form
                    className="login-form"
                    onSubmit={
                        handleSubmit
                    }
                >

                    {/* ==========================================
                        USERNAME
                    ========================================== */}

                    <div className="login-field">

                        <label className="login-label">
                            Username
                        </label>


                        <input
                            className="login-input"
                            type="text"
                            value={
                                username
                            }
                            onChange={(
                                e,
                            ) =>
                                setUsername(
                                    e.target.value,
                                )
                            }
                            placeholder="Enter your username"
                            autoComplete="username"
                            required
                        />

                    </div>


                    {/* ==========================================
                        PASSWORD
                    ========================================== */}

                    <div className="login-field">

                        <label className="login-label">
                            Password
                        </label>


                        <input
                            className="login-input"
                            type="password"
                            value={
                                password
                            }
                            onChange={(
                                e,
                            ) =>
                                setPassword(
                                    e.target.value,
                                )
                            }
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />

                    </div>


                    {/* ==========================================
                        ERROR
                    ========================================== */}

                    {
                        error
                        && (

                            <p
                                className="login-error"
                                role="alert"
                            >
                                {
                                    error
                                }
                            </p>

                        )
                    }


                    {/* ==========================================
                        SIGN IN
                    ========================================== */}

                    <button
                        className="login-button"
                        type="submit"
                        disabled={
                            loading
                        }
                    >

                        {
                            loading
                                ? "Signing in..."
                                : "Sign In"
                        }

                    </button>


                    {/* ==========================================
                        FOOTER
                    ========================================== */}

                    <div className="login-footer">

                        <p
                            className="forgot-link"
                            onClick={() =>
                                navigate(
                                    "/forgot-password",
                                )
                            }
                        >
                            Forgot Password?
                        </p>

                    </div>

                </form>

            </div>

        </div>

    );
};


export default Login;