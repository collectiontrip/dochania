import "./ModerationContentPanel.css";


const ModerationContentPanel = ({
    content,
}) => {


    // ============================================================
    // GUARD
    // ============================================================

    if (
        !content
        ||
        typeof content !== "object"
    ) {

        return (

            <section
                className="moderation-content-panel"
            >

                <div
                    className="moderation-content-panel__header"
                >

                    <div>

                        <p
                            className="moderation-content-panel__eyebrow"
                        >
                            Reported Content
                        </p>


                        <h2
                            className="moderation-content-panel__title"
                        >
                            Content
                        </h2>

                    </div>

                </div>


                <div
                    className="moderation-content-panel__empty"
                >
                    No content information is available.
                </div>

            </section>

        );

    }


    // ============================================================
    // DATA
    // ============================================================

    const {
        type,
        id,
        author,
        preview,
        media = [],
        parent_post_id,
        parent_post,
    } = content;


    const contentType =
        type || "content";


    const contentText =
        preview || "";


    const authorUsername =
        author?.username ||
        "Unknown User";


    const profilePicture =
        author?.profile_picture ||
        null;


    // ============================================================
    // HELPERS
    // ============================================================

    const formatContentType = (
        value,
    ) => {

        if (
            !value
            ||
            typeof value !== "string"
        ) {

            return "Content";

        }


        return value
            .replaceAll(
                "_",
                " ",
            )
            .replace(
                /\b\w/g,
                (
                    character,
                ) =>
                    character.toUpperCase(),
            );

    };


    const getInitial = (
        username,
    ) => {

        if (
            !username
            ||
            typeof username !== "string"
        ) {

            return "?";

        }


        return username
            .charAt(0)
            .toUpperCase();

    };


    // ============================================================
    // NORMALIZE MEDIA
    // ============================================================

    const mediaItems =
        Array.isArray(media)
            ? media
            : [];


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section
            className="moderation-content-panel"
        >

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div
                className="moderation-content-panel__header"
            >

                <div>

                    <p
                        className="moderation-content-panel__eyebrow"
                    >
                        Reported Content
                    </p>


                    <h2
                        className="moderation-content-panel__title"
                    >
                        Content
                    </h2>

                </div>


                <span
                    className="moderation-content-panel__type"
                >

                    {
                        formatContentType(
                            contentType,
                        )
                    }

                </span>

            </div>


            {/* ====================================================
                AUTHOR
            ==================================================== */}

            <div
                className="moderation-content-panel__author"
            >

                <div
                    className="moderation-content-panel__avatar"
                >

                    {
                        profilePicture
                            ? (
                                <img
                                    src={profilePicture}
                                    alt={
                                        `${authorUsername} profile`
                                    }
                                    className="moderation-content-panel__avatar-image"
                                />
                            )
                            : (
                                getInitial(
                                    authorUsername,
                                )
                            )
                    }

                </div>


                <div
                    className="moderation-content-panel__author-info"
                >

                    <span
                        className="moderation-content-panel__author-label"
                    >
                        Posted by
                    </span>


                    <strong
                        className="moderation-content-panel__author-name"
                    >
                        {authorUsername}
                    </strong>

                </div>

            </div>


            {/* ====================================================
                CONTENT BODY
            ==================================================== */}

            <div
                className="moderation-content-panel__body"
            >

                {
                    contentText
                        ? (
                            <p
                                className="moderation-content-panel__text"
                            >
                                {contentText}
                            </p>
                        )
                        : (
                            <p
                                className="moderation-content-panel__no-text"
                            >
                                This content does not contain text.
                            </p>
                        )
                }

            </div>


            {/* ====================================================
                MEDIA
            ==================================================== */}

            {
                mediaItems.length > 0
                &&
                (
                    <div
                        className="moderation-content-panel__media"
                    >

                        <div
                            className="moderation-content-panel__media-header"
                        >

                            <span>
                                Media
                            </span>


                            <span>
                                {mediaItems.length}
                            </span>

                        </div>


                        <div
                            className="moderation-content-panel__media-grid"
                        >

                            {
                                mediaItems.map(
                                    (
                                        item,
                                        index,
                                    ) => {

                                        if (
                                            !item
                                            ||
                                            typeof item !== "object"
                                            ||
                                            !item.url
                                        ) {

                                            return null;

                                        }


                                        return (

                                            <a
                                                key={
                                                    item.id ||
                                                    `media-${index}`
                                                }
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="moderation-content-panel__media-item"
                                            >

                                                <img
                                                    src={item.url}
                                                    alt={
                                                        `Reported content media ${index + 1}`
                                                    }
                                                    className="moderation-content-panel__media-image"
                                                />

                                            </a>

                                        );

                                    },
                                )
                            }

                        </div>

                    </div>
                )
            }


            {/* ====================================================
                COMMENT PARENT POST
            ==================================================== */}

            {
                contentType === "comment"
                &&
                parent_post_id
                &&
                (
                    <div
                        className="moderation-content-panel__parent"
                    >

                        <div
                            className="moderation-content-panel__parent-header"
                        >

                            <span>
                                Parent Post
                            </span>


                            <span>
                                {parent_post_id}
                            </span>

                        </div>


                        {
                            parent_post
                            &&
                            typeof parent_post === "object"
                            &&
                            (
                                <div
                                    className="moderation-content-panel__parent-content"
                                >

                                    {
                                        parent_post.author?.username
                                        &&
                                        (
                                            <span
                                                className="moderation-content-panel__parent-author"
                                            >
                                                {
                                                    parent_post.author.username
                                                }
                                            </span>
                                        )
                                    }


                                    {
                                        parent_post.preview
                                        &&
                                        (
                                            <p
                                                className="moderation-content-panel__parent-preview"
                                            >
                                                {
                                                    parent_post.preview
                                                }
                                            </p>
                                        )
                                    }

                                </div>
                            )
                        }

                    </div>
                )
            }


            {/* ====================================================
                CONTENT ID
            ==================================================== */}

            {
                id
                &&
                (
                    <div
                        className="moderation-content-panel__content-id"
                    >

                        <span>
                            Content ID
                        </span>


                        <code>
                            {id}
                        </code>

                    </div>
                )
            }

        </section>

    );

};


export default ModerationContentPanel;
