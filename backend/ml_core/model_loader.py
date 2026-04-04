import logging
import joblib
import os
import io

logger = logging.getLogger(__name__)

class ModelLoader:
    _instance = None
    _models = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._load_all_models()
        return cls._instance

    def _load_all_models(self):
        logger.info("Initializing Model Loader... This might take a moment.")
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models")
        
        # Load the models specifically. We gracefully fallback to mock strings if they're not physically there yet.
        self._models["kalman"] = self._try_load(joblib.load, os.path.join(base_dir, "kalman_filter.pkl"))
        self._models["rf_exercise"] = self._try_load(joblib.load, os.path.join(base_dir, "random_forest.pkl"))
        self._models["isolation_forest"] = self._try_load(joblib.load, os.path.join(base_dir, "isolation_forest.pkl"))
        
        # H5/TensorFlow models omitted for simple loading demo here
        self._models["gru"] = "gru_model_h5_mock" 
        self._models["lstm"] = "lstm_model_h5_mock"
        
        logger.info(f"Loaded models: {list(self._models.keys())}")

    def _try_load(self, loader_func, path):
        try:
            if os.path.exists(path):
                return loader_func(path)
            else:
                return f"mock_model_for_{os.path.basename(path)}"
        except Exception as e:
            logger.error(f"Error loading model {path}: {e}")
            return f"failed_load_mock_for_{os.path.basename(path)}"

    def get_model(self, name: str):
        return self._models.get(name)

# Singleton instance across application
model_loader = ModelLoader()
