import "./AdvancedOptions.css";

const OPTIONS = Object.freeze([
    {
        key: "allowComments",
        icon: "💬",
        title: "Allow Comments",
        description: "Viewers can comment on this post.",
    },
    {
        key: "hideLikeCount",
        icon: "❤️",
        title: "Hide Like Count",
        description: "Only you can see the total likes.",
    },
]);

const AdvancedOptions = ({
    allowComments = true,
    hideLikeCount = false,
    onAllowCommentsChange,
    onHideLikeCountChange,
    disabled = false,
}) => {

    const values = {
        allowComments,
        hideLikeCount,
    };

    const handlers = {
        allowComments: onAllowCommentsChange,
        hideLikeCount: onHideLikeCountChange,
    };

    const handleToggle = (key) => {

        if (disabled) {
            return;
        }

        const handler = handlers[key];

        if (typeof handler !== "function") {
            return;
        }

        handler(!values[key]);
    };

    return (
        <section
            className="advanced-options"
            aria-labelledby="advanced-options-heading"
        >
            <div className="advanced-options__header">

                <h3
                    id="advanced-options-heading"
                    className="advanced-options__title"
                >
                    Advanced Options
                </h3>

                <p className="advanced-options__subtitle">
                    Customize how people interact with your post.
                </p>

            </div>

            <div
                className="advanced-options__list"
                role="group"
                aria-labelledby="advanced-options-heading"
            >

                {OPTIONS.map((option) => {

                    const checked = values[option.key];

                    const titleId =
                        `advanced-option-${option.key}-title`;

                    const descriptionId =
                        `advanced-option-${option.key}-description`;

                    return (
                        <button
                            key={option.key}
                            type="button"
                            className={
                                checked
                                    ? "advanced-option advanced-option--active"
                                    : "advanced-option"
                            }
                            onClick={() => handleToggle(option.key)}
                            disabled={disabled}
                            role="switch"
                            aria-checked={checked}
                            aria-labelledby={titleId}
                            aria-describedby={descriptionId}
                        >

                            <div className="advanced-option__left">

                                <span
                                    className="advanced-option__icon"
                                    aria-hidden="true"
                                >
                                    {option.icon}
                                </span>

                                <div className="advanced-option__content">

                                    <span
                                        id={titleId}
                                        className="advanced-option__title"
                                    >
                                        {option.title}
                                    </span>

                                    <span
                                        id={descriptionId}
                                        className="advanced-option__description"
                                    >
                                        {option.description}
                                    </span>

                                </div>

                            </div>

                            <span
                                className={
                                    checked
                                        ? "advanced-option__switch advanced-option__switch--active"
                                        : "advanced-option__switch"
                                }
                                aria-hidden="true"
                            >
                                <span className="advanced-option__thumb" />
                            </span>

                        </button>
                    );

                })}

            </div>

        </section>
    );
};

export default AdvancedOptions;