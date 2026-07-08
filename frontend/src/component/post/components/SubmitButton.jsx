import "./SubmitButton.css";

const SubmitButton = ({
    loading,
    onClick,
}) => {
    return (
        <button
            type="button"
            className="submit-post-btn"
            onClick={onClick}
            disabled={loading}
        >
            {loading
                ? "Creating..."
                : "Create Post"}
        </button>
    );
};

export default SubmitButton;