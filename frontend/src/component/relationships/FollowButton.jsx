
const FollowButton  = ({ 
    isFollowing, 
    onFollow, 
    onUnfollow,
    disabled, 
}) => {
    return (
        <button
            disabled={disabled}
            className={
                isFollowing
                    ? "following-btn"
                    : "follow-btn"

            }
            onClick={
                isFollowing 
                    ? onUnfollow 
                    : onFollow
            }
        >
            {isFollowing ? "Following" : "Follow"}
        </button>
    );
};

export default FollowButton;