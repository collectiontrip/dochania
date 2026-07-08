import { useEffect, useRef, useState } from "react";

import "./VisibilitySelector.css";

const VISIBILITY_OPTIONS = [
    {
        value: "public",
        label: "Public",
        icon: "🌍",
        description: "Anyone can view this post.",
    },
    {
        value: "followers",
        label: "Followers",
        icon: "👥",
        description: "Only your followers can view this post.",
    },
    {
        value: "friends",
        label: "Friends",
        icon: "🤝",
        description: "Only your friends can view this post.",
    },
    {
        value: "subscribers",
        label: "Subscribers",
        icon: "⭐",
        description: "Only your subscribers can view this post.",
    },
    {
        value: "private",
        label: "Private",
        icon: "🔒",
        description: "Only you can view this post.",
    },
];

const VisibilitySelector = ({
    value,
    onChange,
}) => {

    const [isOpen, setIsOpen] = useState(false);

    const dropdownRef = useRef(null);

    const selectedVisibility =
        VISIBILITY_OPTIONS.find(
            (option) => option.value === value
        ) ?? VISIBILITY_OPTIONS[0];

    useEffect(() => {

        const handleOutsideClick = (event) => {

            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }

        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };

    }, []);

    const handleSelect = (value) => {

        onChange(value);

        setIsOpen(false);

    };

    return (

        <div className="visibility-selector">

            <label className="visibility-label">
                Who can see this post?
            </label>

            <div
                className="visibility-dropdown"
                ref={dropdownRef}
            >

                <button
                    type="button"
                    className="visibility-trigger"
                    onClick={() =>
                        setIsOpen((prev) => !prev)
                    }
                    aria-expanded={isOpen}
                >

                    <div className="visibility-selected">

                        <span className="visibility-icon">
                            {selectedVisibility.icon}
                        </span>

                        <div>

                            <div className="visibility-title">
                                {selectedVisibility.label}
                            </div>

                            <div className="visibility-subtitle">
                                {selectedVisibility.description}
                            </div>

                        </div>

                    </div>

                    <span className="visibility-arrow">
                        {isOpen ? "▲" : "▼"}
                    </span>

                </button>

                {
                    isOpen && (

                        <div className="visibility-menu">

                            {
                                VISIBILITY_OPTIONS.map((option) => (

                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`visibility-option ${
                                            option.value === value
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            handleSelect(option.value)
                                        }
                                    >

                                        <span className="visibility-icon">
                                            {option.icon}
                                        </span>

                                        <div>

                                            <div className="visibility-title">
                                                {option.label}
                                            </div>

                                            <div className="visibility-subtitle">
                                                {option.description}
                                            </div>

                                        </div>

                                    </button>

                                ))
                            }

                        </div>

                    )
                }

            </div>

        </div>

    );

};

export default VisibilitySelector;