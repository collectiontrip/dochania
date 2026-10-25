
import { useEffect, useState } from "react";

import subscriptionService from "../../services/subscriptionService";

const CreatorSubscribers = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSubscribers = async () => {
        setLoading(true);
        setError("");

        try {
            const response =
                await subscriptionService.getCreatorSubscribers();

            const data = response.data;

            const subscriberList = Array.isArray(data)
                ? data
                : Array.isArray(data?.results)
                    ? data.results
                    : [];

            setSubscribers(subscriberList);
        } catch (err) {
            console.error(
                "Failed to fetch creator subscribers:",
                err
            );

            setError(
                err.response?.data?.detail ||
                err.response?.data?.message ||
                "Failed to load your subscribers."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const formatDate = (value) => {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "N/A";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <section className="creator-subscribers">
                <p>Loading your subscribers...</p>
            </section>
        );
    }

    return (
        <section className="creator-subscribers">
            <header className="creator-subscribers-header">
                <div>
                    <h2>My Subscribers</h2>
                    <p>
                        People who currently subscribe to your content.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchSubscribers}
                    disabled={loading}
                >
                    Refresh
                </button>
            </header>

            {error && (
                <div role="alert" className="creator-subscribers-error">
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={fetchSubscribers}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!error && subscribers.length === 0 && (
                <div className="creator-subscribers-empty">
                    <h3>No active subscribers yet</h3>
                    <p>
                        When someone subscribes to your plans,
                        they will appear here.
                    </p>
                </div>
            )}

            {subscribers.length > 0 && (
                <div className="creator-subscribers-list">
                    {subscribers.map((subscription) => (
                        <article
                            className="creator-subscriber-card"
                            key={subscription.id}
                        >
                            <div className="creator-subscriber-info">
                                <h3>
                                    {subscription.subscriber_username
                                        ? `@${subscription.subscriber_username}`
                                        : `Subscriber #${subscription.subscriber}`}
                                </h3>

                                <p>
                                    Plan:{" "}
                                    {subscription.plan_name || "N/A"}
                                </p>

                                <p>
                                    Price:{" "}
                                    {subscription.plan_price_coins ?? "N/A"}{" "}
                                    coins
                                </p>

                                <p>
                                    Tier:{" "}
                                    {subscription.plan_tier_level ?? "N/A"}
                                </p>
                            </div>

                            <div className="creator-subscriber-dates">
                                <p>
                                    <span>Started:</span>{" "}
                                    {formatDate(subscription.start_date)}
                                </p>

                                <p>
                                    <span>Expires:</span>{" "}
                                    {formatDate(subscription.end_date)}
                                </p>

                                <span className="creator-subscriber-status">
                                    Active
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
};

export default CreatorSubscribers;
