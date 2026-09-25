import {
    useCallback,
    useMemo,
} from "react";

import "./ModerationPagination.css";


const ModerationPagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {


    // ============================================================
    // NORMALIZE VALUES
    // ============================================================

    const normalizedCurrentPage =
        Number.isFinite(
            Number(currentPage),
        )
            ?
            Math.max(
                1,
                Math.floor(
                    Number(currentPage),
                ),
            )
            :
            1;


    const normalizedTotalPages =
        Number.isFinite(
            Number(totalPages),
        )
            ?
            Math.max(
                1,
                Math.floor(
                    Number(totalPages),
                ),
            )
            :
            1;


    const safeCurrentPage =
        Math.min(
            normalizedCurrentPage,
            normalizedTotalPages,
        );


    // ============================================================
    // PAGE CHANGE
    // ============================================================

    const handlePageChange = useCallback(
        (page) => {

            const nextPage =
                Number(page);


            if (
                !Number.isFinite(
                    nextPage,
                )
            ) {
                return;
            }


            const normalizedPage =
                Math.floor(
                    nextPage,
                );


            if (
                normalizedPage < 1
                ||
                normalizedPage >
                    normalizedTotalPages
            ) {
                return;
            }


            if (
                normalizedPage ===
                safeCurrentPage
            ) {
                return;
            }


            if (
                typeof onPageChange !==
                "function"
            ) {
                return;
            }


            onPageChange(
                normalizedPage,
            );

        },
        [
            normalizedTotalPages,
            onPageChange,
            safeCurrentPage,
        ],
    );


    // ============================================================
    // PREVIOUS PAGE
    // ============================================================

    const handlePrevious = useCallback(
        () => {

            if (
                safeCurrentPage <= 1
            ) {
                return;
            }


            handlePageChange(
                safeCurrentPage - 1,
            );

        },
        [
            handlePageChange,
            safeCurrentPage,
        ],
    );


    // ============================================================
    // NEXT PAGE
    // ============================================================

    const handleNext = useCallback(
        () => {

            if (
                safeCurrentPage >=
                normalizedTotalPages
            ) {
                return;
            }


            handlePageChange(
                safeCurrentPage + 1,
            );

        },
        [
            handlePageChange,
            normalizedTotalPages,
            safeCurrentPage,
        ],
    );


    // ============================================================
    // PAGE ITEMS
    // ============================================================

    const pageItems = useMemo(
        () => {

            /*
             * Small number of pages:
             *
             * 1 2 3 4 5
             */

            if (
                normalizedTotalPages <= 7
            ) {

                return Array.from(
                    {
                        length:
                            normalizedTotalPages,
                    },
                    (
                        _,
                        index,
                    ) =>
                        index + 1,
                );

            }


            const items = [];


            /*
             * Always show first page.
             */

            items.push(
                1,
            );


            /*
             * Near beginning:
             *
             * 1 2 3 4 5 ... 20
             */

            if (
                safeCurrentPage <= 4
            ) {

                items.push(
                    2,
                    3,
                    4,
                    5,
                    "ellipsis-right",
                    normalizedTotalPages,
                );


                return items;

            }


            /*
             * Near end:
             *
             * 1 ... 16 17 18 19 20
             */

            if (
                safeCurrentPage >=
                normalizedTotalPages - 3
            ) {

                items.push(
                    "ellipsis-left",
                    normalizedTotalPages - 4,
                    normalizedTotalPages - 3,
                    normalizedTotalPages - 2,
                    normalizedTotalPages - 1,
                    normalizedTotalPages,
                );


                return items;

            }


            /*
             * Middle:
             *
             * 1 ... 8 9 10 ... 20
             */

            items.push(
                "ellipsis-left",
                safeCurrentPage - 1,
                safeCurrentPage,
                safeCurrentPage + 1,
                "ellipsis-right",
                normalizedTotalPages,
            );


            return items;

        },
        [
            normalizedTotalPages,
            safeCurrentPage,
        ],
    );


    // ============================================================
    // HIDE PAGINATION
    // ============================================================

    if (
        normalizedTotalPages <= 1
    ) {
        return null;
    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <nav
            className="moderation-pagination"
            aria-label="Moderation case pagination"
        >


            {/* ==================================================
                PREVIOUS
            ================================================== */}

            <button
                type="button"
                className="moderation-pagination__button moderation-pagination__previous"
                onClick={
                    handlePrevious
                }
                disabled={
                    safeCurrentPage === 1
                }
                aria-label="Go to previous page"
            >

                <span
                    aria-hidden="true"
                >
                    ←
                </span>

                <span>
                    Previous
                </span>

            </button>


            {/* ==================================================
                PAGE NUMBERS
            ================================================== */}

            <div
                className="moderation-pagination__pages"
            >

                {
                    pageItems.map(
                        (
                            item,
                            index,
                        ) => {

                            if (
                                typeof item ===
                                "string"
                            ) {

                                const isLeftEllipsis =
                                    item ===
                                    "ellipsis-left";


                                return (

                                    <span
                                        key={
                                            `${item}-${index}`
                                        }
                                        className="moderation-pagination__ellipsis"
                                        aria-hidden="true"
                                    >
                                        •••
                                    </span>

                                );

                            }


                            const isActive =
                                item ===
                                safeCurrentPage;


                            return (

                                <button
                                    key={
                                        item
                                    }
                                    type="button"
                                    className={
                                        "moderation-pagination__page " +
                                        (
                                            isActive
                                                ?
                                                "moderation-pagination__page--active"
                                                :
                                                ""
                                        )
                                    }
                                    onClick={() =>
                                        handlePageChange(
                                            item,
                                        )
                                    }
                                    aria-label={
                                        `Go to page ${item}`
                                    }
                                    aria-current={
                                        isActive
                                            ?
                                            "page"
                                            :
                                            undefined
                                    }
                                >

                                    {
                                        item
                                    }

                                </button>

                            );

                        },
                    )
                }

            </div>


            {/* ==================================================
                NEXT
            ================================================== */}

            <button
                type="button"
                className="moderation-pagination__button moderation-pagination__next"
                onClick={
                    handleNext
                }
                disabled={
                    safeCurrentPage ===
                    normalizedTotalPages
                }
                aria-label="Go to next page"
            >

                <span>
                    Next
                </span>

                <span
                    aria-hidden="true"
                >
                    →
                </span>

            </button>

        </nav>

    );

};


export default ModerationPagination;