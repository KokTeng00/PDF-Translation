from fastapi import FastAPI, File, UploadFile, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pdf_crawler import PDFTextExtractor
import tempfile
import os

app = FastAPI()

allowed_origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"],
)

router = APIRouter(tags=["extract_text"])

@router.post("/extract_text")
async def extract_text_from_pdf(pdf: UploadFile = File(...)):
    OPENAI_API_KEY = "sk-proj-"
    pdf_crawler = PDFTextExtractor(OPENAI_API_KEY)
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")
    try:
        # Save the uploaded PDF to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            tmp_file.write(await pdf.read())
            tmp_path = tmp_file.name
        pages = pdf_crawler.extract_text_from_pdf(tmp_path)
        os.remove(tmp_path)

        processed_pages = []
        print("Extracted text from PDF:")
        for i, page in enumerate(pages, start=1):
            pdf_text = page.get("pdf_text", "").strip()
            image_ocr_text = page.get("image_ocr_text", "").strip()
            
            page_data = {"pdf_text": pdf_text}
            print(f"Page {i}:")
            print(pdf_text)
            
            if image_ocr_text:
                page_data["image_ocr_text"] = image_ocr_text
                print("Image OCR Text:")
                print(image_ocr_text)
            print("-" * 20)
            
            processed_pages.append(page_data)
        return {"pages": processed_pages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(router)
handler = Mangum(app)

# Example usage with cURL:
# cd crawler
# uvicorn app:app --reload
# 
# curl -X POST "http://127.0.0.1:8000/extract_text" \
#      -F "pdf=@/Users/ngkokteng/PycharmProjects/PDF-Translation/crawler/001-HIDE-AND-SEEK-Free-Childrens-Book-By-Monkey-Pen.pdf"