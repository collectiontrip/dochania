import {
    useCallback,
    useEffect,
    useState,
} from "react";

import subscriptionService from "../../services/subscriptionService";


const MySubscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSubscriptions = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response =
                await subscriptionService.getMyContentPurchases();
            
            const data = response.data;

            const subscriptionList = Array.isArray(data)
                ? data 
                : Array.isArray(data?.result)
                    ? data.result 
                    : [];

            setSubscriptions(subscriptionList);
        
        } catch (err) {
            console.error(
                "Failed to fetch subscriptions:",
                err 
            );

            const responseData = err.response?.data;

            setError(
                responseData?.detil ||
                responseData?.message ||
                "Failed to load your subscriptions. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadSubscriptions = async () => {
            try {
                const response = 
                    await subscriptionService.getMySubscriptions();
                
                const data = response.data;

                const subscriptionList = Array.isArray(data)
                    ? data 
                    : Array.isArray(data?.results)
                        ? data.results
                        : [];

                if (isMounted) {
                    setSubscriptions(subscriptionList);
                    setError("");
                }
            
            } catch (err) {
                console.error(
                    "Failed to fetch subscriptions:",
                    err 
                );

                if (isMounted) {
                    setError(
                        err.response?.data?.detail ||
                        err.response?.data?.message ||
                        "Failed to load your subscriptions. Please try again."
                    );
                }
            
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadSubscriptions();

        return () => {
            isMounted = false;
        };
    }, []);

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "Not available";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Not available";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const getDisplayStatus = (subscription) => {
        const endDate = new Date(subscription.end_date);

        if (
            subscription.status === "active" &&
            subscription.end_date &&
            !Number.isNaN(endDate.getTime()) &&
            endDate.getTime() <= Date.now()
        ) {
            return "expired";
        }

        return subscription.status || "unknown";
    };

    const formatStatus = (status) => {
        return status
            .replaceAll("_", " ")
            .replace(/\b\w/, (character) =>
                character.toUpperCase()
            );
    };

    if (loading) {
        return (
            <section className="my_subscriptions">
                <p>Loading your subscriptions...</p>
            </section>
        );
    }

    return (
        <section className="my-subscriptions">
            <header className="my-subscriptions-header">
                <div>
                    <h2>My Subscriptions</h2>

                    <p>
                        Manage and view creators you subscribe to.
                    </p>

                </div>

                <button
                    type="button"
                    onClick={fetchSubscriptions}
                    disabled={loading}
                >
                    Refresh 

                </button>
            </header>

            {error && (
                <div
                    type="button"
                    onClick={fetchSubscriptions}
                    disabled={loading}
                >
                    Try Again 

                </div>
            )}

            {!error && subscriptions.length === 0 && (
                <div className="my-subscriptions-empty">
                    <h3>No subscriptions yet</h3>

                    <p>
                        When you subscribe to a creator,
                        your subscriptions will appear here.
                    </p>

                </div>
            )}

            {subscriptions.length > 0 && (
                <div className="my-subscriptions-list">
                    {subscriptions.map((subscription) => {
                        const status =
                            getDisplayStatus(subscription);

                        return (
                            <article
                                className="my-subscription-card"
                                key={subscription.id}
                            >
                                <div className="my-subscription-main">
                                    <div className="my-subscription-creator">
                                        <h3>
                                            {subscription.creator_username
                                                ? `@${subscription.creator_username}`
                                                : `Creator #${subscription.creator}`}

                                        </h3>

                                        <span
                                            className={`my-subscription-status my-subscription-status-${status}`}
                                        >
                                            {formatStatus(status)}

                                        </span>
                                    </div>

                                    <h4>
                                        {subscription.plan_name ||
                                            "Subscription Plan"}
                                    </h4>

                                    <p>
                                        Price:{" "}
                                        {subscription.plan_price_coins ??
                                            "N/A"} {" "}
                                        coins
                                    </p>

                                    <p>
                                        Tier:{" "}
                                        {subscription.plan_tier_level ??
                                            "N/A"}
                                    </p>

                                </div>

                                <div className="my-subscription-dates">
                                    
                                    <p>
                                        <span>Started:</span>{" "}
                                        {formatDate(
                                            subscription.start_date 
                                        )}
                                    </p>
                                    
                                    <p>
                                        <span>Expires:</span>{" "}
                                        {formatDate(
                                            subscription.end_date
                                        )}
                                    </p>

                                    <p>
                                        <span>Auto-renew:</span>{" "}
                                        {subscription.auto_renew
                                            ? "Enabled"
                                            : "Disabled"}
                                    </p>

                                </div>

                            </article>
                        );
                    })}

                </div>

            )}
            
        </section>
    );
};


export default MySubscriptions;