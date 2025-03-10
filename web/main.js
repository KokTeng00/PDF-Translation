document.addEventListener("DOMContentLoaded", function() {
    let selectedFile = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let extractedPages = [];

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.id = "pdf-upload";
    document.body.appendChild(fileInput);

    const loadButton = document.createElement("button");
    loadButton.innerText = "Load";
    loadButton.disabled = true;
    loadButton.style.position = "absolute";
    loadButton.style.top = "10px";
    loadButton.style.right = "260px";
    document.body.appendChild(loadButton);

    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.disabled = true;
    deleteButton.style.position = "absolute";
    deleteButton.style.top = "10px";
    deleteButton.style.right = "190px";
    document.body.appendChild(deleteButton);

    const extractButton = document.createElement("button");
    extractButton.innerText = "Extract & Translate Text";
    extractButton.disabled = true;
    extractButton.style.position = "absolute";
    extractButton.style.top = "10px";
    extractButton.style.right = "10px";
    document.body.appendChild(extractButton);

    const pagesContainer = document.createElement("div");
    pagesContainer.id = "pdf-pages";
    pagesContainer.style.position = "absolute";
    pagesContainer.style.top = "50px";
    pagesContainer.style.left = "0";
    pagesContainer.style.right = "40%";
    pagesContainer.style.bottom = "50px";
    pagesContainer.style.overflow = "hidden";
    document.body.appendChild(pagesContainer);

    const textContainer = document.createElement("div");
    textContainer.id = "extracted-text";
    textContainer.style.position = "absolute";
    textContainer.style.top = "50px";
    textContainer.style.right = "0";
    textContainer.style.bottom = "50px";
    textContainer.style.width = "40%";
    textContainer.style.overflow = "auto";
    textContainer.style.padding = "10px";
    textContainer.style.borderLeft = "1px solid #ccc";
    textContainer.innerHTML = "<p>No translated text yet.</p>";
    document.body.appendChild(textContainer);

    const prevButton = document.createElement("button");
    prevButton.id = "prev-button";
    prevButton.innerText = "Previous";
    prevButton.disabled = true;
    prevButton.style.position = "absolute";
    prevButton.style.bottom = "10px";
    prevButton.style.left = "10px";
    document.body.appendChild(prevButton);

    const nextButton = document.createElement("button");
    nextButton.id = "next-button";
    nextButton.innerText = "Next";
    nextButton.disabled = true;
    nextButton.style.position = "absolute";
    nextButton.style.bottom = "10px";
    nextButton.style.right = "10px";
    document.body.appendChild(nextButton);

    extractButton.addEventListener("click", function() {
        extractAndTranslateText();
    });

    fileInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            selectedFile = new File([file], file.name, { type: file.type });
            loadButton.disabled = false;
        } else {
            alert("Please upload a valid PDF file.");
            selectedFile = null;
            loadButton.disabled = true;
        }
    });

    deleteButton.addEventListener("click", function() {
        if (pdfDoc) {
            pdfDoc = null;
            selectedFile = null;
            currentPage = 1;
            totalPages = 0;
            extractedPages = [];
            
            pagesContainer.innerHTML = "";
            textContainer.innerHTML = "<p>No translated text yet.</p>";
            
            fileInput.value = "";
            loadButton.disabled = true;
            updateButtons();
            console.log("PDF document removed");
        }
    });

    loadButton.addEventListener("click", function() {
        if (!selectedFile) {
            alert("No valid PDF file selected.");
            return;
        }
        extractedPages = [];
        textContainer.innerHTML = "<p>No translated text yet.</p>";
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            const pdfData = new Uint8Array(arrayBuffer);

            pdfjsLib.getDocument({ data: pdfData }).promise.then(function(pdf) {
                pdfDoc = pdf;
                totalPages = pdf.numPages;
                console.log("PDF loaded. Number of pages:", totalPages);
                
                currentPage = 1;
                renderPage(currentPage);
                updateButtons();
            }).catch(function(error) {
                console.error("Error loading PDF:", error);
            });
        };
        reader.readAsArrayBuffer(selectedFile);
    });

    function renderPage(pageNum) {
        pdfDoc.getPage(pageNum).then(function(page) {
            pagesContainer.innerHTML = "";
            
            const unscaledViewport = page.getViewport({ scale: 1 });
            const containerWidth = pagesContainer.clientWidth;
            const containerHeight = pagesContainer.clientHeight;
            const scaleWidth = containerWidth / unscaledViewport.width;
            const scaleHeight = containerHeight / unscaledViewport.height;
            const scale = Math.min(scaleWidth, scaleHeight);
            
            const viewport = page.getViewport({ scale: scale });
            
            const wrapper = document.createElement("div");
            wrapper.style.position = "relative";
            wrapper.style.width = viewport.width + "px";
            wrapper.style.height = viewport.height + "px";
            pagesContainer.appendChild(wrapper);
            
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.position = "absolute";
            canvas.style.top = "0";
            canvas.style.left = "0";
            wrapper.appendChild(canvas);
            const context = canvas.getContext("2d");
            
            page.render({
                canvasContext: context,
                viewport: viewport
            }).promise.then(function() {
                console.log("Page rendered at scale:", scale);
            });
        });
    }

    function updateButtons() {
        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;
        deleteButton.disabled = !pdfDoc;
        extractButton.disabled = !pdfDoc;
    }

    function displayTranslatedTextForCurrentPage() {
        const pageData = extractedPages[currentPage - 1];
        if (pageData) {
            let html = `<h3>Page ${currentPage} (Translated):</h3>`;
            if (pageData.pdf_text) {
                html += `<p>${pageData.pdf_text}</p>`;
            } else {
                html += `<p>No translated text for this page.</p>`;
            }
            if (pageData.image_ocr_text) {
                html += `<h4>Image OCR (Translated):</h4>`;
                if (typeof pageData.image_ocr_text === 'string') {
                    html += `<p>${pageData.image_ocr_text}</p>`;
                } else if (Array.isArray(pageData.image_ocr_text)) {
                    pageData.image_ocr_text.forEach((ocr, index) => {
                        html += `<p>[Image ${index + 1}]: ${ocr}</p>`;
                    });
                }
            }
            textContainer.innerHTML = html;
        } else {
            textContainer.innerHTML = `<p>No translated text for page ${currentPage} yet.</p>`;
        }
    }

    async function translateText(text) {
        try {
            const response = await fetch("http://127.0.0.1:8000/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    text: text, 
                    model: "o3-mini", 
                    target_language: "chinese" 
                })
            });
            if (!response.ok) {
                throw new Error("Translation API response was not ok");
            }
            const data = await response.json();
            return data.translated_text;
        } catch (error) {
            console.error("Error translating text:", error);
            return text;
        }
    }

    function extractAndTranslateText() {
        if (!selectedFile) {
            alert("No file selected.");
            return;
        }
        const formData = new FormData();
        formData.append("pdf", new File([selectedFile], selectedFile.name, { type: selectedFile.type }));
    
        fetch("http://127.0.0.1:8000/extract_text", {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(async data => {
            const pages = data.pages;
            for (let i = 0; i < pages.length; i++) {
                if (pages[i].pdf_text) {
                    pages[i].pdf_text = await translateText(pages[i].pdf_text);
                }
                if (pages[i].image_ocr_text) {
                    if (typeof pages[i].image_ocr_text === "string") {
                        pages[i].image_ocr_text = await translateText(pages[i].image_ocr_text);
                    } else if (Array.isArray(pages[i].image_ocr_text)) {
                        for (let j = 0; j < pages[i].image_ocr_text.length; j++) {
                            pages[i].image_ocr_text[j] = await translateText(pages[i].image_ocr_text[j]);
                        }
                    }
                }
            }
            extractedPages = pages;
            console.log("Extracted and translated pages:", extractedPages);
            displayTranslatedTextForCurrentPage();
        })
        .catch(error => {
            console.error("Error extracting text:", error);
            alert("Error extracting text. See console for details.");
        });
    }

    prevButton.addEventListener("click", function() {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
            updateButtons();
            displayTranslatedTextForCurrentPage();
        }
    });

    nextButton.addEventListener("click", function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
            updateButtons();
            displayTranslatedTextForCurrentPage();
        }
    });

    window.addEventListener("resize", function() {
        if (pdfDoc) {
            renderPage(currentPage);
        }
    });
});



// cd /Users/ngkokteng/PycharmProjects/PDF-Translation/web
// python3 -m http.server 8000
// http://localhost:8000/main.html