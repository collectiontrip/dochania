import {
    useNavigate,
} from "react-router-dom";


import ReportStatusBadge from "./ReportStatusBadge";


import "./ReportCard.css";


// ============================================================
// DEFAULT AVATAR
// ============================================================

const DEFAULT_AVATAR =
    "/default-avatar.png";


const ReportCard = ({
    report,
}) => {

    const navigate =
        useNavigate();


    if (!report) {
        return null;
    }


    // ============================================================
    // REPORT DATA
    // ============================================================

    const reasonLabel =
        report.reason_label
        || report.reason
        || "Unknown";


    const description =
        report.description
        || "";


    const createdAt =
        report.created_at
        || "";


    const reportedContent =
        report.reported_content
        || null;


    // ============================================================
    // DATE FORMATTER
    // ============================================================

    const formatDate = (
        value,
    ) => {

        if (!value) {
            return "";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime(),
            )
        ) {
            return "";
        }


        return date.toLocaleString();
    };


    // ============================================================
    // CONTENT TYPE
    // ============================================================

    const isPost =
        reportedContent?.type === "post";


    const isComment =
        reportedContent?.type === "comment";


    // ============================================================
    // CONTENT AUTHOR
    // ============================================================

    const author =
        reportedContent?.author
        || null;


    // ============================================================
    // PARENT POST
    // ============================================================

    const parentPost =
        reportedContent?.parent_post
        || null;


    // ============================================================
    // VIEW POST
    // ============================================================

    const handleViewPost = (
        postId = null,
    ) => {

        /*
         * The View Post button passes the React click event.
         *
         * Therefore, only accept primitive IDs here.
         * If an event/object is received, fall back
         * to the reported content ID.
         */

        const validPostId =
            (
                typeof postId === "string"
                || typeof postId === "number"
            )
                ? postId
                : null;


        const id =
            validPostId
            || reportedContent?.id
            || null;


        if (!id) {
            return;
        }


        navigate(
            `/posts/${id}`,
        );
    };


    // ============================================================
    // VIEW COMMENT
    // ============================================================

    const handleViewComment = () => {

        /*
         * There is currently no dedicated
         * comment route in the application.
         *
         * Open the parent post instead.
         */

        if (!parentPost?.id) {
            return;
        }


        navigate(
            `/posts/${parentPost.id}`,
        );
    };


    // ============================================================
    // VIEW PARENT POST
    // ============================================================

    const handleViewParentPost = () => {

        if (!parentPost?.id) {
            return;
        }


        navigate(
            `/posts/${parentPost.id}`,
        );
    };


    // ============================================================
    // VIEW USER PROFILE
    // ============================================================

    const handleViewAuthor = (
        contentAuthor,
    ) => {

        if (!contentAuthor) {
            return;
        }


        const userId =
            contentAuthor.id
            || contentAuthor.user_id
            || null;


        if (!userId) {
            return;
        }


        navigate(
            `/users/${userId}`,
        );
    };


    // ============================================================
    // RENDER AUTHOR
    // ============================================================

    const renderAuthor = (
        contentAuthor,
    ) => {

        if (!contentAuthor) {
            return null;
        }


        const username =
            contentAuthor.username
            || "Unknown user";


        const profilePicture =
            contentAuthor.profile_picture
            || DEFAULT_AVATAR;


        const userId =
            contentAuthor.id
            || contentAuthor.user_id
            || null;


        const canOpenProfile =
            Boolean(userId);


        return (

            <button
                type="button"
                className="report-card-author"
                onClick={() =>
                    handleViewAuthor(
                        contentAuthor,
                    )
                }
                disabled={
                    !canOpenProfile
                }
                aria-label={
                    canOpenProfile
                        ? `View ${username}'s profile`
                        : username
                }
            >

                <img
                    className="report-card-author-image"
                    src={
                        profilePicture
                    }
                    alt={
                        username
                    }
                    onError={(
                        event,
                    ) => {

                        event.currentTarget.onerror =
                            null;

                        event.currentTarget.src =
                            DEFAULT_AVATAR;

                    }}
                />


                <span
                    className="report-card-author-name"
                >
                    {
                        username
                    }
                </span>

            </button>

        );
    };


    // ============================================================
    // RENDER MEDIA
    // ============================================================

    const renderMedia = (
        media = [],
        postId = null,
    ) => {

        if (
            !Array.isArray(media)
            || media.length === 0
        ) {
            return null;
        }


        return (

            <div
                className="report-card-media"
            >

                {
                    media.map(
                        (
                            item,
                            index,
                        ) => {

                            if (
                                !item?.url
                            ) {
                                return null;
                            }


                            const mediaKey =
                                item.id
                                || `${postId}-${index}`;


                            // ====================================
                            // VIDEO
                            // ====================================

                            if (
                                item.media_type
                                === "video"
                            ) {

                                return (

                                    <video
                                        key={
                                            mediaKey
                                        }
                                        className="report-card-media-item"
                                        src={
                                            item.url
                                        }
                                        controls
                                        preload="metadata"
                                    />

                                );
                            }


                            // ====================================
                            // IMAGE
                            // ====================================

                            return (

                                <button
                                    key={
                                        mediaKey
                                    }
                                    type="button"
                                    className="report-card-media-button"
                                    onClick={() =>
                                        handleViewPost(
                                            postId,
                                        )
                                    }
                                    disabled={
                                        !postId
                                    }
                                    aria-label="View reported post"
                                >

                                    <img
                                        className="report-card-media-item"
                                        src={
                                            item.url
                                        }
                                        alt="Reported post media"
                                        loading="lazy"
                                        onError={(
                                            event,
                                        ) => {

                                            event.currentTarget.style.display =
                                                "none";

                                        }}
                                    />

                                </button>

                            );

                        },
                    )
                }

            </div>

        );
    };


    // ============================================================
    // RENDER POST PREVIEW
    // ============================================================

    const renderPostPreview = ({
        post,
        title = "Reported Post",
        showButton = false,
        onView = null,
    }) => {

        if (!post) {
            return null;
        }


        return (

            <div
                className="report-card-post"
            >

                {/* ================================================
                    CONTENT HEADER
                ================================================= */}

                <div
                    className="report-card-content-header"
                >

                    <span
                        className="report-card-content-label"
                    >
                        {
                            title
                        }
                    </span>

                </div>


                {/* ================================================
                    AUTHOR
                ================================================= */}

                {
                    renderAuthor(
                        post.author,
                    )
                }


                {/* ================================================
                    POST PREVIEW
                ================================================= */}

                {
                    post.preview
                    && (

                        <p
                            className="report-card-content-preview"
                        >
                            {
                                post.preview
                            }
                        </p>

                    )
                }


                {/* ================================================
                    MEDIA
                ================================================= */}

                {
                    renderMedia(
                        post.media,
                        post.id,
                    )
                }


                {/* ================================================
                    VIEW BUTTON
                ================================================= */}

                {
                    showButton
                    && onView
                    && post.id
                    && (

                        <button
                            type="button"
                            className="report-card-view-button"
                            onClick={() =>
                                onView(
                                    post.id,
                                )
                            }
                        >
                            View Post →
                        </button>

                    )
                }

            </div>

        );
    };


    // ============================================================
    // RENDER REPORTED CONTENT
    // ============================================================

    const renderReportedContent = () => {

        // ========================================================
        // CONTENT UNAVAILABLE
        // ========================================================

        if (!reportedContent) {

            return (

                <div
                    className="report-card-content-unavailable"
                >
                    Reported content is no longer available.
                </div>

            );
        }


        // ========================================================
        // POST REPORT
        // ========================================================

        if (isPost) {

            return renderPostPreview({

                post:
                    reportedContent,

                title:
                    "Reported Post",

                showButton:
                    true,

                onView:
                    handleViewPost,

            });
        }


        // ========================================================
        // COMMENT REPORT
        // ========================================================

        if (isComment) {

            return (

                <div
                    className="report-card-comment-wrapper"
                >

                    {/* ==========================================
                        REPORTED COMMENT
                    ========================================== */}

                    <div
                        className="report-card-comment"
                    >

                        <div
                            className="report-card-content-header"
                        >

                            <span
                                className="report-card-content-label"
                            >
                                Reported Comment
                            </span>

                        </div>


                        {/* AUTHOR */}

                        {
                            renderAuthor(
                                author,
                            )
                        }


                        {/* COMMENT TEXT */}

                        {
                            reportedContent.preview
                            && (

                                <p
                                    className={
                                        "report-card-content-preview "
                                        + "report-card-comment-preview"
                                    }
                                >
                                    "
                                    {
                                        reportedContent.preview
                                    }
                                    "
                                </p>

                            )
                        }


                        {/* VIEW COMMENT */}

                        {
                            parentPost?.id
                            && (

                                <button
                                    type="button"
                                    className="report-card-view-button"
                                    onClick={
                                        handleViewComment
                                    }
                                >
                                    View Comment →
                                </button>

                            )
                        }

                    </div>


                    {/* ==========================================
                        ORIGINAL POST
                    ========================================== */}

                    {
                        parentPost
                        && (

                            <div
                                className="report-card-parent-post"
                            >

                                {
                                    renderPostPreview({

                                        post:
                                            parentPost,

                                        title:
                                            "Original Post",

                                        showButton:
                                            true,

                                        onView:
                                            handleViewParentPost,

                                    })
                                }

                            </div>

                        )
                    }

                </div>

            );
        }


        return null;
    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <article
            className="report-card"
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <div
                className="report-card-header"
            >

                <div
                    className="report-card-reason"
                >

                    <span
                        className="report-card-label"
                    >
                        Reason
                    </span>


                    <h3>
                        {
                            reasonLabel
                        }
                    </h3>

                </div>


                <ReportStatusBadge
                    status={
                        report.status
                    }
                />

            </div>


            {/* ==================================================
                REPORTED CONTENT
            ================================================== */}

            <div
                className="report-card-reported-content"
            >

                {
                    renderReportedContent()
                }

            </div>


            {/* ==================================================
                DESCRIPTION
            ================================================== */}

            {
                description
                && (

                    <div
                        className="report-card-description"
                    >

                        <span
                            className="report-card-label"
                        >
                            Details
                        </span>


                        <p>
                            {
                                description
                            }
                        </p>

                    </div>

                )
            }


            {/* ==================================================
                REPORT DATE
            ================================================== */}

            {
                createdAt
                && (

                    <div
                        className="report-card-date"
                    >

                        <span
                            className="report-card-label"
                        >
                            Reported on
                        </span>


                        <time
                            dateTime={
                                createdAt
                            }
                        >
                            {
                                formatDate(
                                    createdAt,
                                )
                            }
                        </time>

                    </div>

                )
            }

        </article>

    );
};


export default ReportCard;