import ModerationCaseCard from "./ModerationCaseCard";


const ModerationCaseList = ({
    cases = [],
    onOpen,
}) => {


    // ============================================================
    // VALIDATION
    // ============================================================

    const moderationCases =
        Array.isArray(
            cases,
        )

            ? cases.filter(
                (
                    moderationCase,
                ) =>
                    moderationCase
                    &&
                    typeof moderationCase ===
                    "object"
                    &&
                    !Array.isArray(
                        moderationCase,
                    ),
            )

            : [];


    // ============================================================
    // EMPTY STATE
    // ============================================================

    if (
        moderationCases.length ===
        0
    ) {

        return null;

    }


    // ============================================================
    // OPEN CASE
    // ============================================================

    const handleOpenCase = (
        moderationCase,
    ) => {

        if (
            !moderationCase
            ||
            typeof moderationCase !==
            "object"
            ||
            Array.isArray(
                moderationCase,
            )
        ) {

            return;

        }


        if (
            typeof onOpen !==
            "function"
        ) {

            return;

        }


        onOpen(
            moderationCase,
        );

    };


    // ============================================================
    // GET CASE KEY
    // ============================================================

    const getCaseKey = (
        moderationCase,
        index,
    ) => {

        /*
         * ModerationCase.id is the actual
         * backend primary key.
         *
         * Backend:
         *
         * id = UUIDField(
         *     primary_key=True,
         *     default=uuid.uuid4,
         *     editable=False,
         * )
         *
         * There is no case_id field in
         * UserModerationCaseSerializer.
         */

        if (
            moderationCase?.id !==
            null
            &&
            moderationCase?.id !==
            undefined
            &&
            moderationCase?.id !==
            ""
        ) {

            return String(
                moderationCase.id,
            );

        }


        /*
         * Defensive fallback.
         *
         * Normally this should never be
         * required because id is always
         * returned by the backend.
         */

        return `moderation-case-${index}`;

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section
            className="moderation-case-list"
            aria-label="Moderation cases"
        >

            {

                moderationCases.map(
                    (
                        moderationCase,
                        index,
                    ) => (

                        <ModerationCaseCard
                            key={
                                getCaseKey(
                                    moderationCase,
                                    index,
                                )
                            }
                            moderationCase={
                                moderationCase
                            }
                            onOpen={
                                handleOpenCase
                            }
                        />

                    ),
                )

            }

        </section>

    );

};


export default ModerationCaseList;
