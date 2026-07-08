import "./BlockButton.css";

const BlockButton = ({
    isBlocked,
    blockedYou = false,
    onBlock,
    onUnblock,
    disabled,
}) => {

    if (blockedYou) {
        return (
            <button
                className="block-btn"
                disabled
            >
                You are blocked
            </button>
        );
    }

    return (
        <button
            disabled={disabled}
            className={
                isBlocked
                    ? "unblock-btn"
                    : "block-btn"
            }
            onClick={
                isBlocked
                    ? onUnblock
                    : onBlock
            }
        >
            {isBlocked
                ? "Unblock"
                : "Block"}
        </button>
    );
};

export default BlockButton;