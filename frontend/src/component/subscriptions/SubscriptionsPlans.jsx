
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import subscriptionService from "../../services/subscriptionService";

import "./SubscriptionPlans.css";

const SubscriptionPlans = ({
    creatorId,
    currentUserId,
    onSubscriptionSuccess,
}) => {
    const [plans, setPlans] = useState([]);
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [purchasingPlanId, setPurchasingPlanId] = useState(null);

    const isOwnProfile =
        currentUserId != null &&
        creatorId != null &&
        String(currentUserId) === String(creatorId);

    const getList = (data) => {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.results)) {
            return data.results;
        }

        return [];
    };

    const isSubscriptionActive = (subscription) => {
        return (
            subscription?.status === "active" &&
            new Date(subscription.end_date).getTime() > Date.now()
        );
    };

    const fetchSubscriptionData = useCallback(async () => {
        if (!creatorId || isOwnProfile) {
            setPlans([]);
            setActiveSubscription(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const [plansResponse, subscriptionsResponse] =
                await Promise.all([
                    subscriptionService.getSubscriptionPlans({
                        creator_id: creatorId,
                    }),
                    subscriptionService.getMySubscriptions(),
                ]);

            const availablePlans = getList(plansResponse.data);
            const subscriptions = getList(subscriptionsResponse.data);

            const creatorPlans = availablePlans
                .filter(
                    (plan) =>
                        plan.is_active &&
                        String(plan.creator) === String(creatorId)
                )
                .sort(
                    (a, b) =>
                        Number(a.tier_level) - Number(b.tier_level) ||
                        Number(a.price_coins) - Number(b.price_coins)
                );

            const currentSubscription = subscriptions.find(
                (subscription) =>
                    String(subscription.creator) === String(creatorId) &&
                    isSubscriptionActive(subscription)
            );

            setPlans(creatorPlans);
            setActiveSubscription(currentSubscription || null);
        } catch (err) {
            console.error(
                "Failed to load subscription data:",
                err
            );

            setError(
                err.response?.data?.detail ||
                err.response?.data?.message ||
                "Failed to load subscription plans."
            );
        } finally {
            setLoading(false);
        }
    }, [creatorId, isOwnProfile]);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            if (!creatorId || isOwnProfile) {
                setPlans([]);
                setActiveSubscription(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [plansResponse, subscriptionsResponse] =
                    await Promise.all([
                        subscriptionService.getSubscriptionPlans({
                            creator_id: creatorId,
                        }),
                        subscriptionService.getMySubscriptions(),
                    ]);

                if (!isMounted) {
                    return;
                }

                const availablePlans = getList(plansResponse.data);
                const subscriptions = getList(subscriptionsResponse.data);

                const creatorPlans = availablePlans
                    .filter(
                        (plan) =>
                            plan.is_active &&
                            String(plan.creator) === String(creatorId)
                    )
                    .sort(
                        (a, b) =>
                            Number(a.tier_level) - Number(b.tier_level) ||
                            Number(a.price_coins) - Number(b.price_coins)
                    );

                const currentSubscription = subscriptions.find(
                    (subscription) =>
                        String(subscription.creator) === String(creatorId) &&
                        isSubscriptionActive(subscription)
                );

                setPlans(creatorPlans);
                setActiveSubscription(currentSubscription || null);
            } catch (err) {
                console.error(
                    "Failed to load subscription data:",
                    err
                );

                if (isMounted) {
                    setError(
                        err.response?.data?.detail ||
                        err.response?.data?.message ||
                        "Failed to load subscription plans."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [creatorId, isOwnProfile]);

    const handleSubscribe = async (plan) => {
        if (!plan?.id || !creatorId) {
            setError("Invalid subscription plan.");
            return;
        }

        if (isOwnProfile) {
            setError("You cannot subscribe to your own profile.");
            return;
        }

        setError("");
        setMessage("");
        setPurchasingPlanId(plan.id);

        try {
            const response =
                await subscriptionService.purchaseSubscription(plan.id);

            const purchaseMessage =
                response.data?.message ||
                "Subscription updated successfully.";

            setMessage(purchaseMessage);

            await fetchSubscriptionData();

            if (typeof onSubscriptionSuccess === "function") {
                onSubscriptionSuccess(response.data);
            }
        } catch (err) {
            console.error("Subscription purchase failed:", err);

            const data = err.response?.data;
            let errorMessage =
                data?.detail ||
                data?.message ||
                "Failed to purchase subscription.";

            if (Array.isArray(errorMessage)) {
                errorMessage = errorMessage.join(" ");
            } else if (
                data &&
                typeof data === "object" &&
                !data.detail &&
                !data.message
            ) {
                errorMessage = Object.values(data)
                    .flat()
                    .join(" ");
            }

            setError(errorMessage);
        } finally {
            setPurchasingPlanId(null);
        }
    };

    if (isOwnProfile) {
        return null;
    }

    if (loading) {
        return (
            <div className="subscription-plans-status">
                Loading subscription plans...
            </div>
        );
    }

    return (
        <section className="subscription-plans">
            <h2 className="subscription-plans-title">
                Subscription Plans
            </h2>

            {activeSubscription && (
                <div className="subscription-plans-current">
                    <h3>Current Subscription</h3>

                    <p>
                        Plan:{" "}
                        {activeSubscription.plan_name || "Active plan"}
                    </p>

                    <p>
                        Expires:{" "}
                        {new Date(
                            activeSubscription.end_date
                        ).toLocaleDateString()}
                    </p>

                    <p>
                        Status: Active
                    </p>
                </div>
            )}

            {error && (
                <p
                    className="subscription-plans-error"
                    role="alert"
                >
                    {error}
                </p>
            )}

            {message && (
                <p
                    className="subscription-plans-success"
                    role="status"
                >
                    {message}
                </p>
            )}

            {plans.length === 0 && !error ? (
                <p className="subscription-plans-empty">
                    No subscription plans available yet.
                </p>
            ) : (
                <div className="subscription-plans-grid">
                    {plans.map((plan) => {
                        const isSubscribing =
                            purchasingPlanId === plan.id;

                        const isCurrentPlan =
                            activeSubscription &&
                            String(activeSubscription.plan) === String(plan.id);

                        const currentTier = Number(
                            activeSubscription?.plan_tier_level ?? 0
                        );

                        const targetTier = Number(plan.tier_level ?? 0);

                        const isDowngrade =
                            Boolean(activeSubscription) &&
                            targetTier < currentTier;

                        const isSameTierDifferentPlan =
                            Boolean(activeSubscription) &&
                            targetTier === currentTier &&
                            !isCurrentPlan;

                        let buttonLabel = "Subscribe";
                        let buttonDisabled = purchasingPlanId !== null;

                        if (isSubscribing) {
                            buttonLabel = "Processing...";
                        } else if (isCurrentPlan) {
                            buttonLabel = "Renew Current Plan";
                        } else if (isDowngrade) {
                            buttonLabel = "Lower Tier Unavailable";
                            buttonDisabled = true;
                        } else if (isSameTierDifferentPlan) {
                            buttonLabel = "Same Tier Unavailable";
                            buttonDisabled = true;
                        } else if (activeSubscription) {
                            buttonLabel = "Upgrade Plan";
                        }

                        return (
                            <article
                                className="subscription-plan-card"
                                key={plan.id}
                            >
                                <h3 className="subscription-plan-name">
                                    {plan.name}
                                </h3>

                                {plan.description && (
                                    <p className="subscription-plan-description">
                                        {plan.description}
                                    </p>
                                )}

                                <p className="subscription-plan-price">
                                    <strong>{plan.price_coins}</strong>
                                    <span> coins</span>
                                </p>

                                <div className="subscription-plan-details">
                                    <p>
                                        <span>Billing:</span>{" "}
                                        {plan.billing_period || "N/A"}
                                    </p>

                                    <p>
                                        <span>Duration:</span>{" "}
                                        {plan.duration_days} days
                                    </p>

                                    <p>
                                        <span>Tier:</span>{" "}
                                        {plan.tier_level}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="subscription-plan-button"
                                    disabled={buttonDisabled}
                                    onClick={() => handleSubscribe(plan)}
                                >
                                    {buttonLabel}
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default SubscriptionPlans;
