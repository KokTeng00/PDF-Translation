FROM python:3.9-slim

ENV HF_HUB_DOWNLOAD_TIMEOUT=60

RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

COPY . /llm

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY . .

# Command to run the application
CMD ["python", "translation.py"]