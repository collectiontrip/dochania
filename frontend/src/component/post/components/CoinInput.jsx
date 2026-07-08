import "./CoinInput.css";

const MAX_COINS = 100000;

const CoinInput = ({
    value = "",
    onChange,
    disabled = false,
}) => {

    const handleChange = (event) => {

        if (typeof onChange !== "function") {
            return;
        }

        const input = event.target.value;

        if (input === "") {
            onChange("");
            return;
        }

        const coins = Number(input);

        if (
            !Number.isInteger(coins) ||
            coins < 1 ||
            coins > MAX_COINS
        ) {
            return;
        }

        onChange(coins);
    };

    return (
        <section
            className="coin-selector"
            aria-labelledby="coin-selector-heading"
        >
            <div className="coin-selector__header">

                <h3
                    id="coin-selector-heading"
                    className="coin-selector__title"
                >
                    Unlock Price
                </h3>

                <p className="coin-selector__subtitle">
                    Set how many coins users must pay to unlock this post.
                </p>

            </div>

            <div className="coin-selector__input-wrapper">

                <span
                    className="coin-selector__icon"
                    aria-hidden="true"
                >
                    🪙
                </span>

                <input
                    type="number"
                    min="1"
                    max={MAX_COINS}
                    step="1"
                    inputMode="numeric"
                    autoComplete="off"
                    className="coin-selector__input"
                    placeholder="Enter coin amount"
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    aria-label="Unlock price in coins"
                    aria-describedby="coin-selector-hint"
                />

            </div>

            <p
                id="coin-selector-hint"
                className="coin-selector__hint"
            >
                Enter a value between 1 and {MAX_COINS.toLocaleString()} coins.
            </p>

        </section>
    );
};

export default CoinInput;