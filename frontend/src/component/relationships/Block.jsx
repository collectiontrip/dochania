import React, { useEffect, useState } from "react";

import blockService from "../../services/blockService";
import BlockButton from "./BlockButton";

const Block = ({
    user,
    blocked = false,
    blockedYou = false,
    onBlockChange = () => {},
}) => {

    const [loading, setLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        setIsBlocked(blocked);
    }, [blocked]);

    const handleBlock = async () => {

        if (loading) return;

        try {

            setLoading(true);

            await blockService.blockUser(user.id);

            setIsBlocked(true);

            onBlockChange(true);

        } catch (error) {

            console.error(
                "Block failed:",
                error.response?.data || error.message
            );

        } finally {

            setLoading(false);
        }
    };

    const handleUnblock = async () => {

        if (loading) return;

        try {

            setLoading(true);

            await blockService.unblockUser(user.id);

            setIsBlocked(false);

            onBlockChange(false);

        } catch (error) {

            console.error(
                "Unblock failed:",
                error.response?.data || error.message
            );

        } finally {

            setLoading(false);
        }
    };

    return (
        <BlockButton
            isBlocked={isBlocked}
            blockedYou={blockedYou}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
            disabled={loading}
        />
    );
};

export default Block;