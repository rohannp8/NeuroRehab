import numpy as np

class M06LSTMCognitiveScorer:
    def __init__(self, model_instance=None):
        self.model = model_instance

    def predict(self, window_deviation: list) -> dict:
        """
        Takes a sequence of the last N physical deviation scores to spot cognitive fatigue 
        or a drop in tracking consistency using LSTM patterns.
        """
        if not window_deviation or len(window_deviation) < 5:
            return {"score": 85.0, "trend": "Baseline"}
            
        # MOCK IMPLEMENTATION: A high variance in form deviation implies cognitive slipping / distraction
        # In a real model, `window_deviation` becomes a tensor -> self.model.predict(tensor)
        variance = np.var(window_deviation)
        avg_dev = np.mean(window_deviation)
        
        score = max(0.0, 100.0 - (variance * 0.5) - (avg_dev * 0.3))
        
        trend = "Focused"
        if score < 50:
            trend = "Distracted/Cognitive Fatigue"
        elif score < 75:
            trend = "Wavering"
            
        return {"score": round(float(score), 2), "trend": trend}
