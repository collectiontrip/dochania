import "./AccessSelector.css";

const ACCESS_OPTIONS = Object.freeze([
    {
        value: "free",
        label: "Free",
        icon: "🆓",
        description: "Anyone who can view this post can access it for free.",
    },
    {
        value: "paid",
        label: "Paid",
        icon: "🪙",
        description: "Users must pay coins to unlock this post.",
    },
]);

const AccessSelector = ({
    value = "free",
    onChange,
    disabled = false,
}) => {

    const handleChange = (accessType) => {

        if (
            disabled ||
            accessType === value ||
            typeof onChange !== "function"
        ) {
            return;
        }

        onChange(accessType);

    };

    return (
        <section
            className="access-selector"
            aria-labelledby="access-selector-heading"
        >
            <div className="access-selector__header">

                <h3
                    id="access-selector-heading"
                    className="access-selector__title"
                >
                    Post Access
                </h3>

                <p className="access-selector__subtitle">
                    Choose whether viewers need to pay coins to unlock this
                    post.
                </p>

            </div>

            <div
                className="access-selector__options"
                role="radiogroup"
                aria-label="Post access"
            >
                {ACCESS_OPTIONS.map((option) => {

                    const selected =
                        value === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            className={
                                selected
                                    ? "access-option access-option--active"
                                    : "access-option"
                            }
                            onClick={() =>
                                handleChange(option.value)
                            }
                            disabled={disabled}
                            aria-disabled={disabled}
                            role="radio"
                            aria-checked={selected}
                        >
                            <span
                                className="access-option__icon"
                                aria-hidden="true"
                            >
                                {option.icon}
                            </span>

                            <div className="access-option__content">

                                <span className="access-option__label">
                                    {option.label}
                                </span>

                                <span className="access-option__description">
                                    {option.description}
                                </span>

                            </div>

                            <span
                                className={
                                    selected
                                        ? "access-option__indicator access-option__indicator--active"
                                        : "access-option__indicator"
                                }
                                aria-hidden="true"
                            />

                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default AccessSelector;