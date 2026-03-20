// messageUtils.js
import AxiosInstance from "../component/auth/axiosInstance";

/* --------------------------------------------------
FORMAT MESSAGE TIME
-------------------------------------------------- */
export const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
};


/* --------------------------------------------------
FORMAT MESSAGE DATE LABEL
-------------------------------------------------- */
export const formatDateLabel = (dateString) => {

    const msgDate = new Date(dateString);
    const today = new Date();

    const diffTime = today - msgDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    if (diffDays < 7) {
        return msgDate.toLocaleDateString("en-US", {
            weekday: "long"
        });
    }

    return msgDate.toLocaleDateString();
};


/* --------------------------------------------------
FORMAT LAST SEEN
-------------------------------------------------- */
export const formatLastSeen = (time) => {

    if (!time) return "";

    const d = new Date(time);

    return "Last seen " + d.toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short"
    });
};


/* --------------------------------------------------
MESSAGE STATUS
-------------------------------------------------- */
export const getMessageStatus = (msg) => {

    if (msg.is_seen) return "✓✓";
    if (msg.is_delivered) return "✓✓";

    return "✓";
};


/* --------------------------------------------------
FETCH PUBLIC KEY FROM SERVER
-------------------------------------------------- */
export const fetchPublicKey = async (userId) => {

    try {

        const res = await AxiosInstance.get(
            `/users/${userId}/public-key/`
        );

        return res.data.public_key;

    } catch (err) {

        console.error("Public key fetch failed:", err);
        return null;

    }

};


/* --------------------------------------------------
CLEAN PEM BASE64
-------------------------------------------------- */
const cleanBase64 = (pem) => {

    if (!pem || typeof pem !== "string") return "";

    return pem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\s+/g, "");

};


/* --------------------------------------------------
IMPORT PUBLIC KEY
-------------------------------------------------- */
const importPublicKey = async (publicKeyBase64) => {

    const cleanedKey = cleanBase64(publicKeyBase64);

    if (!cleanedKey) {
        throw new Error("Invalid public key");
    }

    const binaryDer = Uint8Array.from(
        atob(cleanedKey),
        c => c.charCodeAt(0)
    );

    return await crypto.subtle.importKey(
        "spki",
        binaryDer.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["encrypt"]
    );

};


/* --------------------------------------------------
RSA ENCRYPT
-------------------------------------------------- */
const rsaEncrypt = async (message, publicKeyBase64) => {

    const key = await importPublicKey(publicKeyBase64);

    const encoded = new TextEncoder().encode(message);

    const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        key,
        encoded
    );

    return btoa(
        String.fromCharCode(...new Uint8Array(encrypted))
    );

};


/* --------------------------------------------------
ENCRYPT MESSAGE
(Receiver + Sender Copy)
-------------------------------------------------- */
export const encryptMessage = async (
    message,
    receiverPublicKey,
    senderPublicKey
) => {

    try {

        if (!message) {
            throw new Error("Message empty");
        }

        // RSA size protection
        if (message.length > 180) {
            throw new Error("Message too long for RSA encryption");
        }

        const encryptedForReceiver = await rsaEncrypt(
            message,
            receiverPublicKey
        );

        const encryptedForSender = await rsaEncrypt(
            message,
            senderPublicKey
        );

        if (process.env.NODE_ENV === "development") {

            console.log("Encrypted (receiver)", encryptedForReceiver);
            console.log("Encrypted (sender)", encryptedForSender);

        }

        return {

            forReceiver: encryptedForReceiver,
            forSender: encryptedForSender

        };

    } catch (err) {

        console.error("Encryption failed:", err);
        throw err;

    }

};


/* --------------------------------------------------
IMPORT PRIVATE KEY
-------------------------------------------------- */
const importPrivateKey = async (privateKeyJwk) => {

    return await crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["decrypt"]
    );

};


/* --------------------------------------------------
DECRYPT MESSAGE
-------------------------------------------------- */
export const decryptMessage = async (encryptedBase64) => {

    try {

        const privateKeyStored = localStorage.getItem("privateKey");

        if (!privateKeyStored) {
            return encryptedBase64;
        }

        const privateKeyJwk = JSON.parse(privateKeyStored);

        const privateKey = await importPrivateKey(
            privateKeyJwk
        );

        const encryptedBuffer = Uint8Array.from(
            atob(encryptedBase64),
            c => c.charCodeAt(0)
        );

        const decrypted = await crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedBuffer
        );

        return new TextDecoder().decode(decrypted);

    } catch (err) {

        console.error("Decryption failed:", err);
        return encryptedBase64;

    }

};


/* --------------------------------------------------
SORT MESSAGES
-------------------------------------------------- */
export const sortMessages = (messages) => {

    return [...messages].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

};