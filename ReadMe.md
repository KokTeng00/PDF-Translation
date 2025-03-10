# PDF Translation Project

The PDF Translation Project is an end-to-end solution for extracting text from PDF documents and translating it into a target language (default: Chinese) using OpenAI’s API. It integrates robust text extraction, a powerful translation service, and a user-friendly web interface. Additionally, the project provides optional capabilities for fine-tuning translation models using state-of-the-art techniques with mT5 and VBLoRA.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Backend API](#backend-api)
  - [Web Interface](#web-interface)
- [Usage](#usage)
- [Fine-Tuning with mT5 and VBLoRA](#fine-tuning-with-mt5-and-vblora)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

The project provides a comprehensive pipeline to:

- Extract text from PDFs, including Optical Character Recognition (OCR) for embedded images.
- Translate extracted text using an OpenAI-powered service.
- Display translations through an intuitive web interface.
- (Optional) Fine-tune your translation model using mT5 and VBLoRA for enhanced performance.

## Features

- **PDF Extraction:**  
  Leverages robust methods for text extraction and image OCR from PDF files.
  
- **Translation:**  
  Translates the extracted text into the desired language using OpenAI’s API.  
  Default target language is Chinese.
  
- **Web User Interface:**  
  Provides a simple and responsive interface for PDF uploads and displaying translated content.
  
- **Model Fine-Tuning (Optional):**  
  Experiment with fine-tuning your translation model using mT5 along with VBLoRA for parameter-efficient training.  
  **Note:** Initial experiments were paused due to high computational costs and resource limitations. However, the code is fully runnable if you have sufficient resources, so feel free to try it.

## Project Structure

```
PDF-Translation/
├── app.py                      # Main FastAPI application exposing API endpoints.
├── crawler/
│   └── pdf_crawler.py          # Utilities for PDF crawling and text extraction.
├── llm/
│   ├── openai_translation.py   # Translation service utilizing OpenAI's API.
│   └── mt5_translation.py      # Script for fine-tuning mT5 using VBLoRA (optional).
├── web/
│   ├── main.html               # HTML file for the web interface.
│   └── main.js                 # JavaScript handling file uploads and API interactions.
│   └── styles.css              # C# script for frontend designing and styling
└── ReadMe.md                   # Project documentation.
```

## Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/PDF-Translation.git
cd PDF-Translation
```

### Create & Activate a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies

Ensure that your `requirements.txt` file includes packages such as FastAPI, Uvicorn, Mangum, openai, Pillow, Transformers, and Datasets. Then run:

```bash
pip install -r requirements.txt
```

## Configuration

- **OpenAI API Key:**  
  Update the `OPENAI_API_KEY` constant in both `app.py` and `llm/openai_translation.py` with your valid OpenAI API key.

- **Model Settings:**  
  The default translation model is configured in `llm/openai_translation.py`. Modify the settings if a different model is desired.

## Running the Application

### Backend API

1. **Start the FastAPI Server:**

   ```bash
   uvicorn app:app --reload
   ```

2. **API Endpoints:**

   - `/extract_text`: Endpoint for PDF text extraction.
   - `/translate`: Endpoint for text translation.

   The API will be available at:  
   `http://127.0.0.1:8000`

### Web Interface

1. Ensure the backend API is running.
2. **Change to the `web` Directory:**

   ```bash
   cd web
   ```

3. **Serve the Static Files using Python’s HTTP Server:**

   ```bash
   python3 -m http.server 8000
   ```

4. **Open your Browser and Navigate to:**

   ```
   http://localhost:8000/main.html
   ```

## Usage

- **PDF Upload:**  
  Use the web interface to upload a PDF file. The backend API extracts text (and applies OCR where necessary).

- **Translation:**  
  The extracted text is sent to the `/translate` endpoint, translated using the OpenAI-powered service, and the resulting translation is displayed in the web interface.

## Fine-Tuning with mT5 and VBLoRA

For users interested in custom translation models, the repository includes optional scripts for fine-tuning:

- **mT5:**  
  A multilingual text-to-text transformer pre-trained on extensive multilingual datasets. It serves as a robust base model for translation tasks across multiple languages.

- **VBLoRA:**  
  Stands for Varying Bottleneck Low-Rank Adaptation. This technique allows for efficient fine-tuning by adapting only a small subset of model parameters, which reduces computational costs while maintaining performance as reduce the catastrophic forgetting problem.

The script `llm/mt5_translation.py` demonstrates how to integrate VBLoRA with mT5 for resource-friendly fine-tuning.  
**Note:** Due to high computational costs and resource limitations, initial experiments were paused after a few optimization trials. However, if you have sufficient resources, the code is fully runnable for training your own model. Feel free to explore and extend this capability.

## Troubleshooting

- **422 Unprocessable Entity:**  
  Verify that JSON requests to endpoints (e.g., `/translate`) conform to the expected Pydantic models.

- **OpenAI API Errors:**  
  Confirm that your OpenAI API key is valid and that the model configuration aligns with supported parameters.

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by OpenAI
- Fine-tuning experiments use mT5 enhanced with VBLoRA.
- Special thanks to all contributors and the open-source community.
