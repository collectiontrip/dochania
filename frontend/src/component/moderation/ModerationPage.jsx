
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import moderationService
    from "../../services/moderationService";

import ModerationHeader
    from "./components/ModerationHeader";

import ModerationStats
    from "./components/ModerationStats";

import ModerationFilters
    from "./components/ModerationFilters";

import ModerationCaseList
    from "./components/ModerationCaseList";

import ModerationPagination
    from "./components/ModerationPagination";

import "./ModerationPage.css";


const CASE_TABS = {
    ALL: "all",
    ASSIGNED: "assigned",
    UNASSIGNED: "unassigned",
};


const INITIAL_PAGE = 1;


const MODERATION_PAGE_SIZE = 10;


const DEFAULT_FILTERS = {
    search: "",
    status: "all",
    assignment: "all",
    reason: "all",
    priority: "all",
};


const ModerationPage = () => {


    // ============================================================
    // NAVIGATION
    // ============================================================

    const navigate =
        useNavigate();


    // ============================================================
    // STATE
    // ============================================================

    const [
        activeTab,
        setActiveTab,
    ] = useState(
        CASE_TABS.ALL,
    );


    const [
        filters,
        setFilters,
    ] = useState(
        {
            ...DEFAULT_FILTERS,
        },
    );


    const [
        cases,
        setCases,
    ] = useState([]);


    const [
        page,
        setPage,
    ] = useState(
        INITIAL_PAGE,
    );


    const [
        totalCases,
        setTotalCases,
    ] = useState(0);


    const [
        isLoading,
        setIsLoading,
    ] = useState(true);


    const [
        isRefreshing,
        setIsRefreshing,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    // ============================================================
    // REFS
    // ============================================================

    const requestIdRef =
        useRef(0);


    const isMountedRef =
        useRef(true);


    // ============================================================
    // MOUNT / UNMOUNT
    // ============================================================

    useEffect(() => {

        isMountedRef.current =
            true;


        return () => {

            isMountedRef.current =
                false;

        };

    }, []);


    // ============================================================
    // NORMALIZE API RESPONSE
    // ============================================================

    const normalizeResponse = (
        response,
    ) => {


        // --------------------------------------------------------
        // NON-PAGINATED RESPONSE
        // --------------------------------------------------------

        if (
            Array.isArray(
                response,
            )
        ) {

            return {

                results:
                    response,


                count:
                    response.length,


                next:
                    null,


                previous:
                    null,

            };

        }


        // --------------------------------------------------------
        // PAGINATED RESPONSE
        // --------------------------------------------------------

        if (

            response

            &&

            Array.isArray(
                response.results,
            )

        ) {

            return {

                results:
                    response.results,


                count:
                    Number.isFinite(
                        response.count,
                    )

                        ? response.count

                        : response.results.length,


                next:
                    response.next
                    || null,


                previous:
                    response.previous
                    || null,

            };

        }


        // --------------------------------------------------------
        // INVALID RESPONSE
        // --------------------------------------------------------

        return {

            results:
                [],


            count:
                0,


            next:
                null,


            previous:
                null,

        };

    };


    // ============================================================
    // BUILD FILTER PARAMS
    // ============================================================

    const buildFilterParams = useCallback(
        () => {

            const params = {};


            // ----------------------------------------------------
            // SEARCH
            // ----------------------------------------------------

            const search =
                typeof filters.search ===
                "string"

                    ? filters.search.trim()

                    : "";


            if (
                search
            ) {

                params.search =
                    search;

            }


            // ----------------------------------------------------
            // STATUS
            // ----------------------------------------------------

            if (
                filters.status
                &&
                filters.status !==
                "all"
            ) {

                params.status =
                    filters.status;

            }


            // ----------------------------------------------------
            // ASSIGNMENT
            // ----------------------------------------------------

            if (
                filters.assignment
                &&
                filters.assignment !==
                "all"
            ) {

                params.assignment =
                    filters.assignment;

            }


            // ----------------------------------------------------
            // REASON
            // ----------------------------------------------------

            if (
                filters.reason
                &&
                filters.reason !==
                "all"
            ) {

                params.reason =
                    filters.reason;

            }


            // ----------------------------------------------------
            // PRIORITY
            // ----------------------------------------------------

            if (
                filters.priority
                &&
                filters.priority !==
                "all"
            ) {

                params.priority =
                    filters.priority;

            }


            return params;

        },
        [
            filters,
        ],
    );


    // ============================================================
    // LOAD CASES
    // ============================================================

    const loadCases = useCallback(
        async ({

            tab =
                activeTab,


            pageNumber =
                INITIAL_PAGE,


            refresh =
                false,

        } = {}) => {


            const currentRequestId =
                ++requestIdRef.current;


            // ----------------------------------------------------
            // LOADING STATE
            // ----------------------------------------------------

            if (
                refresh
            ) {

                setIsRefreshing(
                    true,
                );

            } else {

                setIsLoading(
                    true,
                );

            }


            setError("");


            try {

                let response;


                const params = {

                    ...buildFilterParams(),


                    page:
                        pageNumber,


                    page_size:
                        MODERATION_PAGE_SIZE,

                };


                // ------------------------------------------------
                // LOAD BASED ON ACTIVE TAB
                // ------------------------------------------------

                switch (
                    tab
                ) {

                    case CASE_TABS.ASSIGNED:

                        response =
                            await moderationService
                                .getAssignedCases(
                                    params,
                                );

                        break;


                    case CASE_TABS.UNASSIGNED:

                        response =
                            await moderationService
                                .getUnassignedCases(
                                    params,
                                );

                        break;


                    case CASE_TABS.ALL:

                    default:

                        response =
                            await moderationService
                                .getCases(
                                    params,
                                );

                        break;

                }


                // ------------------------------------------------
                // IGNORE OLD REQUESTS
                // ------------------------------------------------

                if (

                    !isMountedRef.current

                    ||

                    currentRequestId !==
                    requestIdRef.current

                ) {

                    return;

                }


                const normalized =
                    normalizeResponse(
                        response,
                    );


                // ------------------------------------------------
                // UPDATE STATE
                // ------------------------------------------------

                setCases(
                    normalized.results,
                );


                setTotalCases(
                    normalized.count,
                );


                setPage(
                    pageNumber,
                );

            } catch (err) {


                // ------------------------------------------------
                // IGNORE OLD REQUESTS
                // ------------------------------------------------

                if (

                    !isMountedRef.current

                    ||

                    currentRequestId !==
                    requestIdRef.current

                ) {

                    return;

                }


                console.error(
                    "Failed to load moderation cases:",
                    err,
                );


                setCases(
                    [],
                );


                setTotalCases(
                    0,
                );


                setError(

                    err?.response?.data?.detail

                    ||

                    err?.response?.data?.message

                    ||

                    "Unable to load moderation cases.",

                );

            } finally {


                // ------------------------------------------------
                // IGNORE OLD REQUESTS
                // ------------------------------------------------

                if (

                    !isMountedRef.current

                    ||

                    currentRequestId !==
                    requestIdRef.current

                ) {

                    return;

                }


                setIsLoading(
                    false,
                );


                setIsRefreshing(
                    false,
                );

            }

        },
        [
            activeTab,
            buildFilterParams,
        ],
    );


    // ============================================================
    // INITIAL LOAD / TAB / FILTER CHANGE
    // ============================================================

    useEffect(() => {

        loadCases({

            tab:
                activeTab,


            pageNumber:
                INITIAL_PAGE,

        });

    }, [
        activeTab,
        filters,
        loadCases,
    ]);


    // ============================================================
    // FILTER CHANGE
    // ============================================================

    const handleFiltersChange = useCallback(
        (
            nextFilters,
        ) => {

            if (
                !nextFilters
                ||
                typeof nextFilters !==
                "object"
                ||
                Array.isArray(nextFilters)
            ) {

                return;

            }


            setFilters({

                search:
                    typeof nextFilters.search ===
                    "string"

                        ? nextFilters.search

                        : "",


                status:
                    typeof nextFilters.status ===
                    "string"

                        ? nextFilters.status

                        : "all",


                assignment:
                    typeof nextFilters.assignment ===
                    "string"

                        ? nextFilters.assignment

                        : "all",


                reason:
                    typeof nextFilters.reason ===
                    "string"

                        ? nextFilters.reason

                        : "all",


                priority:
                    typeof nextFilters.priority ===
                    "string"

                        ? nextFilters.priority

                        : "all",

            });


            setPage(
                INITIAL_PAGE,
            );


            setCases(
                [],
            );


            setTotalCases(
                0,
            );


            setError("");

        },
        [],
    );


    // ============================================================
    // CLEAR FILTERS
    // ============================================================

    const handleClearFilters = useCallback(
        () => {

            setFilters({
                ...DEFAULT_FILTERS,
            });


            setPage(
                INITIAL_PAGE,
            );


            setCases(
                [],
            );


            setTotalCases(
                0,
            );


            setError("");

        },
        [],
    );


    // ============================================================
    // TAB CHANGE
    // ============================================================

    const handleTabChange = useCallback(
        (
            tab,
        ) => {

            if (
                !Object.values(
                    CASE_TABS,
                ).includes(
                    tab,
                )
            ) {

                return;

            }


            if (
                tab ===
                activeTab
            ) {

                return;

            }


            if (
                isLoading
                ||
                isRefreshing
            ) {

                return;

            }


            setCases(
                [],
            );


            setPage(
                INITIAL_PAGE,
            );


            setTotalCases(
                0,
            );


            setError("");


            setActiveTab(
                tab,
            );

        },
        [
            activeTab,
            isLoading,
            isRefreshing,
        ],
    );


    // ============================================================
    // REFRESH
    // ============================================================

    const handleRefresh = useCallback(
        () => {

            if (
                isLoading
                ||
                isRefreshing
            ) {

                return;

            }


            loadCases({

                tab:
                    activeTab,


                pageNumber:
                    page,


                refresh:
                    true,

            });

        },
        [
            activeTab,
            isLoading,
            isRefreshing,
            loadCases,
            page,
        ],
    );


    // ============================================================
    // PAGE CHANGE
    // ============================================================

    const handlePageChange = useCallback(
        (
            nextPage,
        ) => {

            const normalizedPage =
                Number(
                    nextPage,
                );


            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        totalCases /
                        MODERATION_PAGE_SIZE,
                    ),
                );


            if (
                !Number.isInteger(
                    normalizedPage,
                )
            ) {

                return;

            }


            if (
                normalizedPage <
                INITIAL_PAGE
            ) {

                return;

            }


            if (
                normalizedPage >
                totalPages
            ) {

                return;

            }


            if (
                normalizedPage ===
                page
            ) {

                return;

            }


            if (
                isLoading
                ||
                isRefreshing
            ) {

                return;

            }


            loadCases({

                tab:
                    activeTab,


                pageNumber:
                    normalizedPage,

            });

        },
        [
            activeTab,
            isLoading,
            isRefreshing,
            loadCases,
            page,
            totalCases,
        ],
    );


    // ============================================================
    // OPEN CASE
    // ============================================================

    const handleOpenCase = useCallback(
        (
            moderationCase,
        ) => {

            if (
                !moderationCase?.id
            ) {

                return;

            }


            navigate(
                `/moderation/${moderationCase.id}`,
            );

        },
        [
            navigate,
        ],
    );


    // ============================================================
    // TAB LABEL
    // ============================================================

    const getTabLabel = () => {

        switch (
            activeTab
        ) {

            case CASE_TABS.ASSIGNED:

                return "My Cases";


            case CASE_TABS.UNASSIGNED:

                return "Unassigned";


            case CASE_TABS.ALL:

            default:

                return "All Cases";

        }

    };


    // ============================================================
    // TOTAL PAGES
    // ============================================================

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalCases /
                MODERATION_PAGE_SIZE,
            ),
        );


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <main
            className="moderation-page"
            aria-labelledby="moderation-page-title"
        >


            {/* ==================================================
                HEADER
            ================================================== */}

            <ModerationHeader
                onRefresh={
                    handleRefresh
                }
                isLoading={
                    isLoading
                }
                isRefreshing={
                    isRefreshing
                }
            />


            {/* ==================================================
                MODERATION STATS
            ================================================== */}

            <ModerationStats />


            {/* ==================================================
                FILTERS
            ================================================== */}

            <ModerationFilters
                filters={
                    filters
                }
                onChange={
                    handleFiltersChange
                }
                onClear={
                    handleClearFilters
                }
            />


            {/* ==================================================
                CASE TABS
            ================================================== */}

            <nav
                className="moderation-case-tabs"
                aria-label="Moderation case sections"
            >

                <button
                    type="button"
                    className={
                        activeTab ===
                        CASE_TABS.ALL

                            ? "active"

                            : ""
                    }
                    onClick={() =>
                        handleTabChange(
                            CASE_TABS.ALL,
                        )
                    }
                    disabled={
                        isLoading
                        ||
                        isRefreshing
                    }
                >
                    All Cases
                </button>


                <button
                    type="button"
                    className={
                        activeTab ===
                        CASE_TABS.ASSIGNED

                            ? "active"

                            : ""
                    }
                    onClick={() =>
                        handleTabChange(
                            CASE_TABS.ASSIGNED,
                        )
                    }
                    disabled={
                        isLoading
                        ||
                        isRefreshing
                    }
                >
                    My Cases
                </button>


                <button
                    type="button"
                    className={
                        activeTab ===
                        CASE_TABS.UNASSIGNED

                            ? "active"

                            : ""
                    }
                    onClick={() =>
                        handleTabChange(
                            CASE_TABS.UNASSIGNED,
                        )
                    }
                    disabled={
                        isLoading
                        ||
                        isRefreshing
                    }
                >
                    Unassigned
                </button>

            </nav>


            {/* ==================================================
                CONTENT HEADER
            ================================================== */}

            <section
                className="moderation-content-header"
            >

                <div>

                    <h2>

                        {
                            getTabLabel()
                        }

                    </h2>


                    {

                        !isLoading

                        &&

                        !error

                        && (

                            <span>

                                {
                                    totalCases
                                }

                                {" "}

                                {

                                    totalCases === 1

                                        ? "case"

                                        : "cases"

                                }

                            </span>

                        )

                    }

                </div>

            </section>


            {/* ==================================================
                LOADING
            ================================================== */}

            {

                isLoading

                && (

                    <section
                        className="moderation-state"
                        aria-live="polite"
                        aria-busy="true"
                    >

                        <div
                            className="moderation-loader"
                            aria-hidden="true"
                        />


                        <p>
                            Loading moderation cases...
                        </p>

                    </section>

                )

            }


            {/* ==================================================
                ERROR
            ================================================== */}

            {

                !isLoading

                &&

                error

                && (

                    <section
                        className="
                            moderation-state
                            moderation-error
                        "
                        role="alert"
                    >

                        <h2>
                            Unable to load cases
                        </h2>


                        <p>
                            {error}
                        </p>


                        <button
                            type="button"
                            onClick={
                                handleRefresh
                            }
                            disabled={
                                isRefreshing
                            }
                        >

                            {

                                isRefreshing

                                    ? "Retrying..."

                                    : "Try Again"

                            }

                        </button>

                    </section>

                )

            }


            {/* ==================================================
                EMPTY
            ================================================== */}

            {

                !isLoading

                &&

                !error

                &&

                cases.length === 0

                && (

                    <section
                        className="moderation-state"
                    >

                        <h2>
                            No moderation cases
                        </h2>


                        <p>
                            There are currently no cases
                            available in this section.
                        </p>

                    </section>

                )

            }


            {/* ==================================================
                CASE LIST
            ================================================== */}

            {

                !isLoading

                &&

                !error

                &&

                cases.length > 0

                && (

                    <ModerationCaseList
                        cases={
                            cases
                        }
                        onOpen={
                            handleOpenCase
                        }
                    />

                )

            }


            {/* ==================================================
                PAGINATION
            ================================================== */}

            {

                !isLoading

                &&

                !error

                &&

                totalPages > 1

                && (

                    <ModerationPagination
                        currentPage={
                            page
                        }
                        totalPages={
                            totalPages
                        }
                        onPageChange={
                            handlePageChange
                        }
                    />

                )

            }

        </main>

    );

};


export default ModerationPage;
