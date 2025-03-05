import openai
import fitz
from PIL import Image
import io
import time
from openai.error import RateLimitError
import base64

class PDFTextExtractor:
    def __init__(self, openai_api_key: str):
        openai.api_key = openai_api_key

    def safe_gpt4o_mini_extract_text(self, image: Image.Image, retries: int = 5, sleep_seconds: int = 10) -> str:
        for attempt in range(retries):
            try:
                return self.gpt4o_mini_extract_text(image)
            except RateLimitError as e:
                if attempt < retries - 1:
                    print(f"Rate limit hit. Sleeping {sleep_seconds}s then retrying... [Attempt {attempt+1}/{retries}]")
                    time.sleep(sleep_seconds)
                else:
                    raise e

    def gpt4o_mini_extract_text(self, image: Image.Image) -> str:
        max_width, max_height = 600, 600
        image.thumbnail((max_width, max_height))
        
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG", optimize=True, quality=30)
        img_bytes = buffered.getvalue()
        
        encoded_image = base64.b64encode(img_bytes).decode("utf-8")
        
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "If the image doesn't have text within it then you may skip the image and return empty string. Else you have extract the text from the image!"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"}}
                    ]
                }
            ],
        )
        
        extracted_text = response["choices"][0]["message"]["content"]
        return extracted_text

    def extract_text_from_pdf(self, pdf_path: str):
        doc = fitz.open(pdf_path)
        pages_text = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text()
            
            images_ocr_text = []
            image_list = page.get_images(full=True)
            for img in image_list:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                try:
                    pil_image = Image.open(io.BytesIO(image_bytes))
                except Exception:
                    continue
                ocr_text = self.safe_gpt4o_mini_extract_text(pil_image)
                images_ocr_text.append(ocr_text)
            pages_text.append({
                "page_number": page_num + 1,
                "extracted_text": page_text,
                "images_ocr_text": images_ocr_text
            })
        
        return pages_text