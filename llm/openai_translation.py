import openai

class TranslationService:
    def __init__(
        self,
        openai_api_key=None,
        default_target_language="Chinese",
        default_model="gpt-4o-mini"
    ):
        self.default_target_language = default_target_language
        self.default_model = default_model

        if openai_api_key:
            openai.api_key = openai_api_key

    def translate_text(self, text):
        if not text:
            raise ValueError("No text provided")

        target_language = self.default_target_language
        model = self.default_model

        prompt = f"Translate the following text to {target_language}:\n\n{text}"

        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful translation assistant and you must remain professional at all times. Additionally, please remain the original structure and context of the text."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=4096,
                temperature=0.3,
            )
            translated_text = response["choices"][0]["message"]["content"].strip()
            return translated_text
        except Exception as e:
            raise RuntimeError(str(e))