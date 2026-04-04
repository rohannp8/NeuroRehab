import logging
import joblib
import os
import io
import time

logger = logging.getLogger(__name__)

class ModelLoader:
    """
    Singleton model loader with robust error handling.
    Supports joblib, TensorFlow/Keras, XGBoost, and PyTorch models.
    """
    _instance = None
    _models = {}
    _load_times = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._load_all_models()
        return cls._instance

    def _load_all_models(self):
        """Load all models from disk with detailed logging."""
        logger.info("=" * 60)
        logger.info("🚀 INITIALIZING MODEL LOADER - Loading Models into Memory...")
        logger.info("=" * 60)
        
        base_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
            "models"
        )
        
        if not os.path.exists(base_dir):
            logger.error(f"❌ Models directory not found: {base_dir}")
            base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "models")
        
        logger.info(f"📂 Using models directory: {base_dir}")
        
        # --- Core Real-Time Pipeline Models (CRITICAL) ---
        logger.info("\n🔹 Loading Core Pipeline Models...")
        self._models["kalman"] = self._try_load(
            joblib.load, 
            os.path.join(base_dir, "kalman_filter.pkl"),
            "Kalman Filter (Smoothing)"
        )
        self._models["rf_exercise"] = self._try_load(
            joblib.load, 
            os.path.join(base_dir, "random_forest.pkl"),
            "Random Forest (Exercise Classification)"
        )
        self._models["isolation_forest"] = self._try_load(
            joblib.load, 
            os.path.join(base_dir, "isolation_forest.pkl"),
            "Isolation Forest (Anomaly Detection)"
        )

        # --- Temporal / Deep Learning Models ---
        logger.info("\n🔹 Loading Deep Learning Models...")
        self._models["gru"] = self._try_load_keras(
            os.path.join(base_dir, "gru_model.h5"),
            "GRU (Digital Twin)"
        )
        self._models["lstm"] = self._try_load_keras(
            os.path.join(base_dir, "lstm_model.h5"),
            "LSTM (Cognitive Scoring)"
        )

        # --- Analytics & Session Management Models ---
        logger.info("\n🔹 Loading Analytics Models...")
        self._models["dqn"] = self._try_load(
            joblib.load, 
            os.path.join(base_dir, "dqn_model.pkl"),
            "DQN (Notification Agent)"
        )
        self._models["xgboost"] = self._try_load(
            joblib.load, 
            os.path.join(base_dir, "xgboost.pkl"),
            "XGBoost (Recovery Prediction)"
        )
        self._models["bayesian"] = self._try_load(
            joblib.load, 
            os.path.join(base_dir, "bayesian_model.pkl"),
            "Bayesian Network (Adaptive Difficulty)"
        )

        # --- Summary ---
        logger.info("\n" + "=" * 60)
        loaded_models = [k for k, v in self._models.items() if not isinstance(v, str)]
        mocked_models = [k for k, v in self._models.items() if isinstance(v, str)]
        
        logger.info(f"✅ SUCCESSFULLY LOADED: {len(loaded_models)} models")
        if loaded_models:
            for model_name in loaded_models:
                load_time = self._load_times.get(model_name, "N/A")
                logger.info(f"   • {model_name} ({load_time})")
        
        if mocked_models:
            logger.info(f"⚠️  RUNNING AS MOCK: {len(mocked_models)} models")
            for model_name in mocked_models:
                logger.info(f"   • {model_name}")
        
        logger.info("=" * 60)
        logger.info("✅ MODEL LOADER INITIALIZATION COMPLETE\n")

    def _try_load(self, loader_func, path: str, model_name: str = ""):
        """
        Attempt to load a model file with detailed error handling.
        Falls back to mock if file doesn't exist or loading fails.
        """
        try:
            if not os.path.exists(path):
                logger.warning(f"⚠️  {model_name}: File not found at {path}")
                logger.warning(f"    → Using mock model for {model_name}")
                return f"mock_model_{os.path.basename(path)}"
            
            start_time = time.time()
            model = loader_func(path)
            load_time = f"{(time.time() - start_time):.2f}s"
            self._load_times[model_name.split("(")[0].strip()] = load_time
            
            logger.info(f"✅ {model_name}: Successfully loaded ({load_time})")
            return model
            
        except Exception as e:
            logger.error(f"❌ {model_name}: Failed to load - {str(e)}")
            logger.error(f"    → Using mock model for {model_name}")
            return f"mock_model_failed_{os.path.basename(path)}"


    def _try_load_keras(self, path: str, model_name: str = ""):
        """
        Attempt to load a Keras/TensorFlow .h5 model.
        Falls back to mock if file missing or TensorFlow unavailable.
        """
        try:
            if not os.path.exists(path):
                logger.warning(f"⚠️  {model_name}: File not found at {path}")
                logger.warning(f"    → Using mock model for {model_name}")
                return f"mock_h5_model_{os.path.basename(path)}"
            
            start_time = time.time()
            
            # Try TensorFlow 2.x first (recommended)
            try:
                from tensorflow import keras
                model = keras.models.load_model(path)
                load_time = f"{(time.time() - start_time):.2f}s"
                self._load_times[model_name.split("(")[0].strip()] = load_time
                logger.info(f"✅ {model_name}: Successfully loaded via TensorFlow ({load_time})")
                return model
            except (ImportError, ModuleNotFoundError):
                # Try standalone Keras
                import keras
                model = keras.models.load_model(path)
                load_time = f"{(time.time() - start_time):.2f}s"
                self._load_times[model_name.split("(")[0].strip()] = load_time
                logger.info(f"✅ {model_name}: Successfully loaded via Keras ({load_time})")
                return model
                
        except ImportError:
            logger.warning(f"⚠️  {model_name}: TensorFlow/Keras not installed")
            logger.warning(f"    → Using mock model for {model_name}")
            return f"mock_keras_unavailable_{os.path.basename(path)}"
        except Exception as e:
            logger.error(f"❌ {model_name}: Failed to load - {str(e)}")
            logger.error(f"    → Using mock model for {model_name}")
            return f"mock_h5_failed_{os.path.basename(path)}"

    def get_model(self, name: str):
        """
        Safely retrieve a model from the loader.
        Returns the actual model object or a mock string identifier.
        """
        if name not in self._models:
            logger.warning(f"⚠️  Model '{name}' not found in loader. Available: {list(self._models.keys())}")
            return f"unknown_model_{name}"
        return self._models.get(name)
    
    def is_model_loaded(self, name: str) -> bool:
        """Check if a model is actually loaded (not mocked)."""
        model = self._models.get(name)
        return model is not None and not isinstance(model, str)
    
    def get_loaded_models(self) -> list:
        """Return list of actually loaded models (exclude mocks)."""
        return [k for k, v in self._models.items() if not isinstance(v, str)]
    
    def get_mocked_models(self) -> list:
        """Return list of mocked models (files not found or load failed)."""
        return [k for k, v in self._models.items() if isinstance(v, str)]


# Singleton instance across application
model_loader = ModelLoader()
