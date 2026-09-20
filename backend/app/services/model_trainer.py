import os
import random
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import OrdinalEncoder
from sklearn.pipeline import Pipeline
import pickle

MODEL_FILE_PATH = "gateway_ml_model.pkl"

CATEGORICAL_FEATURES = ["bank", "payment_method", "gateway", "merchant", "device", "location"]
NUMERIC_FEATURES = ["amount", "hour", "day_of_week", "previous_failure_rate", "gateway_success_rate", "bank_gateway_failure_rate"]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

class MLRoutingModel:
    def __init__(self):
        self.encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        self.model = HistGradientBoostingClassifier(random_state=42, max_iter=100)
        self.is_trained = False

    def generate_synthetic_dataset(self, num_samples: int = 4000) -> pd.DataFrame:
        np.random.seed(42)
        random.seed(42)

        banks = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Chase Bank"]
        methods = ["UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING"]
        gateways = ["gateway_a", "gateway_b", "gateway_c"]
        merchants = ["merch_amazon", "merch_flipkart", "merch_swiggy", "merch_uber", "merch_makemytrip"]
        devices = ["MOBILE", "DESKTOP"]
        locations = ["Mumbai, IN", "Delhi, IN", "Bengaluru, IN", "Hyderabad, IN", "New York, US"]

        data = []
        for _ in range(num_samples):
            bank = random.choice(banks)
            method = random.choice(methods)
            gw = random.choice(gateways)
            merchant = random.choice(merchants)
            device = random.choice(devices)
            location = random.choice(locations)
            amount = round(float(np.random.exponential(scale=2000.0) + 10.0), 2)
            hour = random.randint(0, 23)
            day = random.randint(0, 6)

            # Base success probability calculations with domain patterns
            base_prob = 0.94

            if gw == "gateway_b":
                base_prob += 0.04
                if method == "UPI":
                    base_prob += 0.02
                if bank in ["HDFC Bank", "ICICI Bank"]:
                    base_prob += 0.015

            elif gw == "gateway_a":
                base_prob += 0.02
                if method in ["CREDIT_CARD", "DEBIT_CARD"]:
                    base_prob += 0.02

            elif gw == "gateway_c":
                base_prob -= 0.02
                if amount > 5000:
                    base_prob -= 0.03

            # Peak hour congestion
            if 18 <= hour <= 22:
                base_prob -= 0.03

            gw_success_rate = round(float(base_prob), 3)
            prev_fail_rate = round(float(random.uniform(0.01, 0.08)), 3)
            bank_gw_fail_rate = round(float(1.0 - base_prob + random.uniform(-0.02, 0.02)), 3)
            bank_gw_fail_rate = max(0.0, min(0.3, bank_gw_fail_rate))

            # Binary outcome
            success = 1 if random.random() <= base_prob else 0

            data.append({
                "bank": bank,
                "payment_method": method,
                "gateway": gw,
                "merchant": merchant,
                "device": device,
                "location": location,
                "amount": amount,
                "hour": hour,
                "day_of_week": day,
                "previous_failure_rate": prev_fail_rate,
                "gateway_success_rate": gw_success_rate,
                "bank_gateway_failure_rate": bank_gw_fail_rate,
                "success": success
            })

        return pd.DataFrame(data)

    def train(self, df: pd.DataFrame = None):
        if df is None:
            df = self.generate_synthetic_dataset()

        X = df[ALL_FEATURES].copy()
        y = df["success"]

        # Fit ordinal encoder on categorical columns
        X[CATEGORICAL_FEATURES] = self.encoder.fit_transform(X[CATEGORICAL_FEATURES])

        # Train model
        self.model.fit(X, y)
        self.is_trained = True

        # Save to disk
        try:
            with open(MODEL_FILE_PATH, "wb") as f:
                pickle.dump({"encoder": self.encoder, "model": self.model}, f)
        except Exception as e:
            print(f"Warning: Could not save model to file: {e}")

    def load_or_train(self):
        if os.path.exists(MODEL_FILE_PATH):
            try:
                with open(MODEL_FILE_PATH, "rb") as f:
                    saved = pickle.load(f)
                    self.encoder = saved["encoder"]
                    self.model = saved["model"]
                    self.is_trained = True
                return
            except Exception as e:
                print(f"Loading model failed, retraining: {e}")
        self.train()

    def predict_success_probability(self, feature_dict: Dict[str, Any]) -> float:
        if not self.is_trained:
            self.load_or_train()

        df_single = pd.DataFrame([feature_dict])
        
        # Ensure all columns present
        for col in ALL_FEATURES:
            if col not in df_single.columns:
                df_single[col] = 0.0 if col in NUMERIC_FEATURES else "UNKNOWN"

        X_single = df_single[ALL_FEATURES].copy()
        
        # Transform categorical
        X_single[CATEGORICAL_FEATURES] = self.encoder.transform(X_single[CATEGORICAL_FEATURES])

        # Predict probability of success (class 1)
        prob = self.model.predict_proba(X_single)[0][1]
        return float(prob)

# Global model instance
ml_model = MLRoutingModel()
