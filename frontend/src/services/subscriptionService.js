import AxiosInstance from "../component/auth/axiosInstance";

const subscriptionService = {

    // Subscription Plans
    getSubscriptionPlans(params = {}) {
        return AxiosInstance.get("/subscriptions/plans/", {
            params,
        });
    },

    createSubscriptionPlan(data) {
        return AxiosInstance.post("/subscriptions/plans/", data);
    },

    getSubscriptionPlan(id) {
        return AxiosInstance.get(`/subscriptions/plans/${id}/`);
    },

    updateSubscriptionPlan(id, data) {
        return AxiosInstance.put(`/subscriptions/plans/${id}/`, data);
    },

    partialUpdateSubscriptionPlan(id, data) {
        return AxiosInstance.patch(`/subscriptions/plans/${id}/`, data);
    },

    deleteSubscriptionPlan(id) {
        return AxiosInstance.delete(`/subscriptions/plans/${id}/`);
    },

    // Subscription Purchase
    purchaseSubscription(planId) {
        return AxiosInstance.post(`/subscriptions/purchase/${planId}/`);
    },

    getMySubscriptions(params = {}) {
        return AxiosInstance.get("/subscriptions/my-subscriptions/", {
            params,
        });
    },

    getCreatorSubscribers(params = {}) {
        return AxiosInstance.get("/subscriptions/creator-subscribers/", {
            params,
        });
    },

    // Paid Content
    purchasePaidPost(postId) {
        return AxiosInstance.post(
            `/subscriptions/posts/${postId}/purchase/`
        );
    },

    getMyContentPurchases(params = {}) {
        return AxiosInstance.get(
            "/subscriptions/my-content-purchases/",
            {
                params,
            }
        );
    },

    // Coin Wallet
    getCoinWallet() {
        return AxiosInstance.get("/subscriptions/wallet/");
    },

    getCoinTransactions(params = {}) {
        return AxiosInstance.get(
            "/subscriptions/wallet/transactions/",
            {
                params,
            }
        );
    },

    // Creator Earnings
    getCreatorEarnings(params = {}) {
        return AxiosInstance.get("/subscriptions/creator-earnings/", {
            params,
        });
    },

    getCreatorEarningsSummary() {
        return AxiosInstance.get(
            "/subscriptions/creator-earnings/summary/"
        );
    },

};

export default subscriptionService;