import {
    useCallback,
    useEffect,
    useState,
} from "react";


import reportService from "../../services/reportService";


import ReportList from "./ReportList";


import "./MyReport.css";


const MyReports = () => {

    const [reports, setReports] = useState([]);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");


    // ============================================================
    // LOAD MY REPORTS
    // ============================================================

    const loadReports = useCallback(
        async () => {

            setLoading(true);

            setError("");


            try {

                const response =
                    await reportService.getMyReports();


                const results =
                    Array.isArray(response)
                        ? response
                        : response?.results;


                if (!Array.isArray(results)) {

                    setReports([]);

                    return;

                }


                setReports(results);

            }

            catch (error) {

                console.error(
                    "Failed to load reports:",
                    error,
                );


                const message =
                    error?.response?.data?.detail ||
                    error?.response?.data?.message ||
                    error?.message ||
                    "Unable to load your reports.";


                setError(message);

            }

            finally {

                setLoading(false);

            }

        },
        [],
    );


    // ============================================================
    // LOAD REPORTS ON MOUNT
    // ============================================================

    useEffect(() => {

        loadReports();

    }, [loadReports]);


    // ============================================================
    // RETRY
    // ============================================================

    const handleRetry = () => {

        loadReports();

    };


    // ============================================================
    // REPORT CLICK
    // ============================================================

    const handleReportClick = (
        report,
    ) => {

        console.log(
            "Report clicked:",
            report,
        );

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section
            className="my-reports"
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <header
                className="my-reports-header"
            >

                <div
                    className="my-reports-header-content"
                >

                    <h1>
                        My Reports
                    </h1>


                    <p>
                        Reports submitted by you.
                    </p>

                </div>

            </header>


            {/* ==================================================
                REPORT LIST
            ================================================== */}

            <ReportList
                reports={reports}
                loading={loading}
                error={error}
                onRetry={handleRetry}
                onReportClick={
                    handleReportClick
                }
            />

        </section>

    );

};


export default MyReports;