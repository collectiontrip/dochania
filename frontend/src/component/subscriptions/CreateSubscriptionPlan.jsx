import {
    useState,
} from "react";

import subscriptionService  from "../../services/subscriptionService";

const initialForm = {
    name: "",
    description: "",
    price_coins: "",
    billing_period: "monthly",
    duration_days: "30",
    tier_level: "1",
    is_active: true,
}

const CreateSubscriptionPlan = ({
    onPlanCreated,
}) => {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError();
        setSuccess();

        if (
            !form.name.trim() ||
            !form.price_coins ||
            !Number(form.price_coins) <= 0 || 
            !form.duration_days ||
            Number(form.duration_days) <= 0 ||
            ! form.tier_level ||
            Number(form.tier_level) < 1 

        ) {
            setError("Please enter valid plan details.")
            return;
        }

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            price_coins: Number(form.price_coins),
            billing_period: form.billing_period,
            duration_days: Number(form.duration_days),
            tier_level: Number(form.tier_level),
            is_active: form.is_active,
        };

        setLoading(true);

        try {
            const response =
                await subscriptionService.createSubscriptionPlan(payload);

            setSuccess("Subscription plan created successfully.");
            setForm(initialForm);

            if (typeof onPlanCreated === "function") {
                onPlanCreated(response.data);
            }
        
        } catch (err) {
            console.error("Failed to create subscription plan:", err);

            const data = err.response?.data;

            if (data && typeof data === "object") {
                const messages = Object.entries(data)
                    .map(([File, value]) => {
                        const detail = Array.isArray(value)
                            ? value.join(" ")
                            : String(value);

                        return `${field}: ${detail}`;
                    });

                setError(
                    messages.join(" ") ||
                    "Failed to create subscription plan."
                );
            
            } else {
                setError("Failed to create subscription plan.");
            } 
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="create-subscription-plan">
            <h2>Create Subscription plan</h2>

            {error && (
                <p role="alert">
                    {error}
                </p>
            )}

            {success && (
                <p role="status">
                    {success}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="plan-name">
                        Plan Name 
                    </label>

                    <input 
                        id="plan-name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={1000}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="plan-description">
                        Description 
                    </label>

                    <textarea
                        id="plan-description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}

                    />

                </div>

                <div>
                    <label htmlFor="plan-price">
                        Price (Coins)
                    </label>

                    <input
                        id="plan_price"
                        name="price-coins"
                        type="number"
                        min="1"
                        step="1"
                        value={form.price_coins}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="billing-period">
                        Billing Period 
                    </label>

                    <select
                        id="billing-period"
                        name="billing_period"
                        value={form.billing_period}
                        onChange={handleChange}
                        required
                    >
                        <option value="monthly">
                            Monthly 
                        </option>

                        <option value="quarterly">
                            Quarterly 
                        </option>

                        <option value="yearly">
                            Yearly 
                        </option>
                    </select>
                </div>

                <div>
                    <label htmlFor="duration-days">
                        Duration (Days)
                    </label>

                    <input 
                        id="duration-days"
                        name="duration_days"
                        type="number"
                        min="1"
                        step="1"
                        value={form.duration_days}
                        onChange={handleChange}
                        required 
                    />
                </div>

                <div>
                    <label htmlFor="tier-lavel">
                        Tier Lavel 
                    </label>

                    <input
                        id="tier-level"
                        name="tier_level"
                        type="number"
                        min="1"
                        sept="1"
                        value={form.tier_level}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <label>
                        <input
                            name="is_active"
                            type="checkbox"
                            checked={form.is_active}
                            onChange={handleChange}
                        />
                        Active Plan
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Creaing..."
                        : "Create Plan"
                    }
                </button>

            </form>
        </section>
    );
};


export default CreateSubscriptionPlan;

