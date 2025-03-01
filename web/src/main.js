document.addEventListener("DOMContentLoaded", function() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.innerHTML = "";

    let selectedFile = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.id = "pdf-upload";
    fileInput.style.position = "absolute";
    fileInput.style.top = "10px";
    fileInput.style.left = "10px";
    document.body.appendChild(fileInput);

    const loadButton = document.createElement("button");
    loadButton.innerText = "Load";
    loadButton.disabled = true;
    loadButton.style.position = "absolute";
    loadButton.style.top = "10px";
    loadButton.style.right = "150px";
    document.body.appendChild(loadButton);

    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.disabled = true;
    deleteButton.style.position = "absolute";
    deleteButton.style.top = "10px";
    deleteButton.style.right = "210px";
    document.body.appendChild(deleteButton);


    const pagesContainer = document.createElement("div");
    pagesContainer.id = "pdf-pages";
    pagesContainer.style.position = "absolute";
    pagesContainer.style.top = "50px";
    pagesContainer.style.left = "0";
    pagesContainer.style.right = "0";
    pagesContainer.style.bottom = "50px";
    pagesContainer.style.overflow = "hidden";
    document.body.appendChild(pagesContainer);

    const prevButton = document.createElement("button");
    prevButton.innerText = "Previous";
    prevButton.disabled = true;
    prevButton.style.position = "absolute";
    prevButton.style.bottom = "10px";
    prevButton.style.left = "10px";
    document.body.appendChild(prevButton);

    const nextButton = document.createElement("button");
    nextButton.innerText = "Next";
    nextButton.disabled = true;
    nextButton.style.position = "absolute";
    nextButton.style.bottom = "10px";
    nextButton.style.right = "10px";
    document.body.appendChild(nextButton);

    // Handle file selection
    fileInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            selectedFile = file;
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
            
            pagesContainer.innerHTML = "";
            
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
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            pagesContainer.appendChild(canvas);
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext).promise.then(function() {
                console.log("Page rendered at scale:", scale);
            });
        });
    }

    function updateButtons() {
        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;
        deleteButton.disabled = !pdfDoc;
    }

    prevButton.addEventListener("click", function() {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
            updateButtons();
        }
    });

    nextButton.addEventListener("click", function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
            updateButtons();
        }
    });

    window.addEventListener("resize", function() {
        if (pdfDoc) {
            renderPage(currentPage);
        }
    });
});


// cd /Users/ngkokteng/PycharmProjects/book_translator/web
// python3 -m http.server 8000