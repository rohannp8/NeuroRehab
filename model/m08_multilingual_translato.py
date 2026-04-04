try:
    from transformers import MBartForConditionalGeneration, MBart50TokenizerFast
except ImportError:
    MBartForConditionalGeneration = MBart50TokenizerFast = None

class M08MBartTranslator:
    def __init__(self, model_name="facebook/mbart-large-50-many-to-many-mmt"):
        self.is_active = MBartForConditionalGeneration is not None
        self.tokenizer = None
        self.model = None

    def load_model(self):
        if not self.is_active or self.model is not None:
            return
        try:
            self.tokenizer = MBart50TokenizerFast.from_pretrained("facebook/mbart-large-50-many-to-many-mmt")
            self.model = MBartForConditionalGeneration.from_pretrained("facebook/mbart-large-50-many-to-many-mmt")
        except Exception:
            self.is_active = False

    def translate(self, text: str, src_lang="en_XX", tgt_lang="hi_IN") -> str:
        """
        Translates text dynamically using the mBART-50 Transformer model.
        Returns gracefully formatted fallback structures if Transformers lib isn't installed for Hackathon constraints.
        """
        mock_in = {"en_XX": text, "hi_IN": f"[HI] {text}", "mr_IN": f"[MR] {text}", "ta_IN": f"[TA] {text}"}
        
        if not self.is_active:
            return mock_in.get(tgt_lang, text)
            
        if self.model is None:
            self.load_model()
            
        if not self.is_active:
             return mock_in.get(tgt_lang, text)
             
        try:
            self.tokenizer.src_lang = src_lang
            encoded = self.tokenizer(text, return_tensors="pt")
            generated_tokens = self.model.generate(
                **encoded,
                forced_bos_token_id=self.tokenizer.lang_code_to_id[tgt_lang]
            )
            return self.tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        except Exception:
            return mock_in.get(tgt_lang, text)
