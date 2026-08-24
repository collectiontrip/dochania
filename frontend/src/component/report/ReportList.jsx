import ReportCard from "./ReportCard";

import "./ReportList.css";


const ReportList = ({
    reports = [],
}) => {

    if (!reports) {
        return null;
    }


    if (reports.length === 0) {
        return (
            <div className="report-list-empty">
                No reports found.
            </div>
        );
    }


    return (
        <section className="report-list">

            {
                reports.map(
                    (report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                        />
                    )
                )
            }

        </section>
    );
};


export default ReportList;