document.addEventListener("DOMContentLoaded", function() {
    // Global variables
    let selectedFile = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let extractedPages = []; // Array to store extraction result for each page

    // Create file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.id = "pdf-upload";
    document.body.appendChild(fileInput);

    // Create Load button
    const loadButton = document.createElement("button");
    loadButton.innerText = "Load";
    loadButton.disabled = true;
    loadButton.style.position = "absolute";
    loadButton.style.top = "10px";
    loadButton.style.right = "150px";
    document.body.appendChild(loadButton);

    // Create Delete button
    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.disabled = true;
    deleteButton.style.position = "absolute";
    deleteButton.style.top = "10px";
    deleteButton.style.right = "210px";
    document.body.appendChild(deleteButton);

    // PDF pages container (60% width reserved for extracted text on right)
    const pagesContainer = document.createElement("div");
    pagesContainer.id = "pdf-pages";
    pagesContainer.style.position = "absolute";
    pagesContainer.style.top = "50px";
    pagesContainer.style.left = "0";
    pagesContainer.style.right = "40%"; // Reserve 40% for text panel
    pagesContainer.style.bottom = "50px";
    pagesContainer.style.overflow = "hidden";
    document.body.appendChild(pagesContainer);

    // Container for extracted text (40% width on the right)
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
    textContainer.innerHTML = "<p>No extracted text yet.</p>";
    document.body.appendChild(textContainer);

    // Create Previous and Next buttons for PDF navigation
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

    // Create Extract Text button
    const extractButton = document.createElement("button");
    extractButton.innerText = "Extract Text";
    extractButton.disabled = true;
    extractButton.style.position = "absolute";
    extractButton.style.top = "10px";
    extractButton.style.right = "10px";
    document.body.appendChild(extractButton);

    extractButton.addEventListener("click", function() {
        extractText();
    });

    // Handle file selection
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

    // Delete loaded PDF and clear extracted text
    deleteButton.addEventListener("click", function() {
        if (pdfDoc) {
            pdfDoc = null;
            selectedFile = null;
            currentPage = 1;
            totalPages = 0;
            extractedPages = []; // Clear stored extraction results
            
            pagesContainer.innerHTML = "";
            textContainer.innerHTML = "<p>No extracted text yet.</p>";
            
            fileInput.value = "";
            loadButton.disabled = true;
            updateButtons();
            console.log("PDF document removed");
        }
    });

    // Load PDF file and clear any previous extraction results
    loadButton.addEventListener("click", function() {
        if (!selectedFile) {
            alert("No valid PDF file selected.");
            return;
        }
        // Clear any old extraction results
        extractedPages = [];
        textContainer.innerHTML = "<p>No extracted text yet.</p>";
        
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

    // Render a page with both a canvas (visual) and a text layer (selectable)
    function renderPage(pageNum) {
        pdfDoc.getPage(pageNum).then(function(page) {
            // Clear previous content
            pagesContainer.innerHTML = "";
            
            // Determine scale to fit page into container
            const unscaledViewport = page.getViewport({ scale: 1 });
            const containerWidth = pagesContainer.clientWidth;
            const containerHeight = pagesContainer.clientHeight;
            const scaleWidth = containerWidth / unscaledViewport.width;
            const scaleHeight = containerHeight / unscaledViewport.height;
            const scale = Math.min(scaleWidth, scaleHeight);
            
            const viewport = page.getViewport({ scale: scale });
            
            // Create a wrapper div to hold the canvas and text layer
            const wrapper = document.createElement("div");
            wrapper.style.position = "relative";
            wrapper.style.width = viewport.width + "px";
            wrapper.style.height = viewport.height + "px";
            pagesContainer.appendChild(wrapper);
            
            // Create the canvas for rendering the PDF page
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.position = "absolute";
            canvas.style.top = "0";
            canvas.style.left = "0";
            wrapper.appendChild(canvas);
            const context = canvas.getContext("2d");
            
            // Render the page into the canvas
            page.render({
                canvasContext: context,
                viewport: viewport
            }).promise.then(function() {
                console.log("Page rendered at scale:", scale);
            });
            
            // Render the text layer on top for selectable text
            page.getTextContent().then(function(textContent) {
                const textLayerDiv = document.createElement("div");
                textLayerDiv.className = "textLayer";
                textLayerDiv.style.position = "absolute";
                textLayerDiv.style.top = "0";
                textLayerDiv.style.left = "0";
                textLayerDiv.style.height = canvas.height + "px";
                textLayerDiv.style.width = canvas.width + "px";
                textLayerDiv.style.pointerEvents = "auto"; // Make text selectable
                wrapper.appendChild(textLayerDiv);
                
                pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: textLayerDiv,
                    viewport: viewport,
                    textDivs: [],
                    enhanceTextSelection: true
                });
            });
        });
    }

    // Update navigation and control button states
    function updateButtons() {
        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;
        deleteButton.disabled = !pdfDoc;
        extractButton.disabled = !pdfDoc;
    }

    // Helper function: Display extracted text for the current page only
    function displayExtractedTextForCurrentPage() {
        const pageData = extractedPages[currentPage - 1];
        if (pageData) {
            let html = `<h3>Page ${currentPage}:</h3>`;
            // Display only the text extracted from the PDF content.
            if (pageData.pdf_text) {
                html += `<p>${pageData.pdf_text}</p>`;
            } else {
                html += `<p>No extracted text for this page.</p>`;
            }
            // Optionally, display OCR results if available
            if (pageData.image_ocr_text) {
                html += `<h4>Image OCR Text:</h4>`;
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
            textContainer.innerHTML = `<p>No extracted text for page ${currentPage} yet.</p>`;
        }
    }

    // Extract text from the PDF via backend API and store per page
    function extractText() {
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
        .then(data => {
            // Save extraction result from backend (an array of page results)
            extractedPages = data.pages;
            console.log("Extracted pages:", extractedPages);
            // Update display to show only current page's extracted text
            displayExtractedTextForCurrentPage();
        })
        .catch(error => {
            console.error("Error extracting text:", error);
            alert("Error extracting text. See console for details.");
        });
    }    

    // Navigation: Previous page
    prevButton.addEventListener("click", function() {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
            updateButtons();
            displayExtractedTextForCurrentPage();
        }
    });

    // Navigation: Next page
    nextButton.addEventListener("click", function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
            updateButtons();
            displayExtractedTextForCurrentPage();
        }
    });

    // Re-render current page on window resize
    window.addEventListener("resize", function() {
        if (pdfDoc) {
            renderPage(currentPage);
        }
    });
});


// cd /Users/ngkokteng/PycharmProjects/PDF-Translation/web
// python3 -m http.server 8000
// http://localhost:8000/main.html