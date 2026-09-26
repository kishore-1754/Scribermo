# Scribermo

[![Python](https://img.shields.io/badge/Python-3.10.21-3776AB?logo=python\&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi\&logoColor=white)](https://fastapi.tiangolo.com/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js\&logoColor=white)](https://vuejs.org/)
[![PaddleOCR](https://img.shields.io/badge/OCR-PaddleOCR-0066FF)](https://github.com/PaddlePaddle/PaddleOCR)
[![Hugging Face](https://img.shields.io/badge/Models-Hugging%20Face-FFD21E?logo=huggingface\&logoColor=black)](https://huggingface.co/)

**Scribermo** is an AI-powered system that converts handwritten text into Indic-language speech.

It combines handwriting recognition, machine translation, and speech synthesis into a single pipeline. The application provides a web interface for uploading handwritten manuscripts and selecting the desired Indic language. It also supports streaming audio responses for resource-constrained devices such as the ESP32.

---

## Features

* Extracts individual handwritten text lines from an image using PaddleOCR.
* Recognizes handwritten English text using TrOCR.
* Translates recognized text into the selected Indic language using IndicTrans2.
* Converts translated Indic text into speech using VITS RASA.
* Supports multiple Indic languages and speakers.
* Provides a Vue 3 web interface.
* Uses FastAPI as the backend server.
* Loads AI models once when the server starts.
* Supports streaming audio responses for ESP32 clients.
* Provides normal binary responses for standard web clients.

---

## How It Works

The processing pipeline consists of the following stages:

1. **Line Extraction**

   PaddleOCR detects and extracts individual lines from the uploaded manuscript image.

2. **Handwriting Recognition**

   Each extracted line is passed to TrOCR to recognize the handwritten English text.

3. **Translation**

   The recognized English text is translated into the selected Indic language using IndicTrans2.

4. **Speech Synthesis**

   The translated Indic text is converted into speech using VITS RASA with the appropriate speaker for the selected language.

5. **Response**

   The application supports two response modes:

   * **Web client:** The translated text and generated audio are returned as a normal binary HTTP response.
   * **ESP32:** The text and audio are streamed progressively using a custom binary protocol to reduce memory requirements on the device.

---

## Architecture

The backend is implemented using FastAPI, while the frontend is built using Vue 3.

FastAPI's `lifespan` mechanism is used to initialize the models when the server starts. This prevents the models from being loaded repeatedly for every request.

The models are stored in the application's state:

```python
@asynccontextmanager
async def loader(app: FastAPI):
    app.state.models = LoadModels()
    app.state.LanguageMap = Languages

    yield
```

Requests can then reuse the already-loaded models:

```python
Models = app.state.models
```

This avoids the overhead of repeatedly initializing large AI models for individual requests.

---

## ESP32 Streaming

Scribermo supports a separate response format for ESP32 clients.

When the request contains:

```text
X-Client-Type: esp32
```

the server returns a `StreamingResponse`.

The stream consists of:

```text
TEXT + 4-byte length + UTF-8 text
AUDIO + 4-byte length + audio chunk
AUDIO + 4-byte length + audio chunk
...
END
```

Audio is read and transmitted in 5 KB chunks instead of constructing a single large response.

For normal web clients, the server returns:

```text
4-byte text length
4-byte audio length
UTF-8 translated text
audio bytes
```

This allows the same backend to support both a browser-based frontend and a resource-constrained ESP32 client.

---

## Technologies

### Frontend

* Vue 3
* HTML
* CSS
* JavaScript

### Backend

* Python
* FastAPI
* Uvicorn

### AI Models

* **PaddleOCR** — handwritten line detection and extraction
* **TrOCR** — handwritten text recognition
* **IndicTrans2** — English to Indic language translation
* **VITS RASA** — Indic speech synthesis

---

## Installation

### 1. Create a Hugging Face Account

Create an account on [Hugging Face](https://huggingface.co/).

### 2. Request Model Access

Access is required for the following models:

* [IndicTrans2 — ai4bharat/indictrans2-en-indic-dist-200M](https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M)
* [VITS RASA — ai4bharat/vits_rasa_13](https://huggingface.co/ai4bharat/vits_rasa_13)

Follow the respective model pages to request access where required.

### 3. Install Hugging Face Hub

```bash
pip install -U huggingface_hub
```

### 4. Create a Hugging Face Access Token

Generate an access token from your Hugging Face account.

### 5. Install Project Dependencies

```bash
pip install -r requirements.txt
```

### 6. Log in to Hugging Face

```bash
huggingface-cli login
```

Enter your Hugging Face credentials/token when prompted.

### 7. Start the Application

For local use:

```bash
uvicorn main:app
```

To allow other devices on the same intranet to connect:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Usage

1. Start the FastAPI server.
2. Open the Scribermo web interface.
3. Upload a handwritten manuscript image.
4. Select the desired Indic language.
5. Click **Translate & Synthesize**.
6. The recognized and translated text will appear in the interface.
7. Play or download the generated speech.

---

## Model Files

Some model files are not included directly in this repository because of their size.

The required `models` directory can be downloaded from the following link:

[Download the models directory](https://drive.google.com/drive/folders/1V3OjQRaXuMWHfV7YnDSpajkIiFPEUJsS?usp=drive_link)

Place the downloaded `models` directory in the expected project location before starting the application.

---

## Demo

[![Scribermo Demo](https://img.youtube.com/vi/3EIt1VS-7VA/maxresdefault.jpg)](https://youtu.be/3EIt1VS-7VA)

The demo video is hosted on YouTube as an unlisted video.

---

## Python Version

This project was developed and tested with:

```text
Python 3.10.21
```

Using this version is recommended to avoid dependency and compatibility issues between the different AI libraries used by the project.

---

## Project Structure

```text
Scribermo/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── models/
│   └── ...
│
├── LoadModels.py
├── LanguageMap.py
├── main.py
├── requirements.txt
└── README.md
```

---

## Acknowledgements

Scribermo uses and builds upon several open-source projects and models.

### AI Models and Frameworks

| Project                                                       | Used For                           | Provider                                        |
| ------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)        | Text line detection and extraction | [PaddlePaddle](https://github.com/PaddlePaddle) |
| [TrOCR](https://github.com/microsoft/unilm/tree/master/trocr) | Handwritten text recognition       | [Microsoft](https://github.com/microsoft)       |
| [IndicTrans2](https://github.com/AI4Bharat/IndicTrans2)       | English to Indic translation       | [AI4Bharat](https://github.com/AI4Bharat)       |
| [VITS RASA](https://huggingface.co/ai4bharat/vits_rasa_13)    | Indic speech synthesis             | [AI4Bharat](https://github.com/AI4Bharat)       |

Scribermo would not be possible without the research, models, and open-source implementations provided by these projects.

---

## Model Licenses

Scribermo uses multiple third-party AI models.

The licenses of the individual models remain applicable to those models and their respective components.

The license for this repository applies only to the original code written for the Scribermo project and does not override or replace the licenses of the third-party models.

Refer to the respective project and model repositories for their licensing terms:

* [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
* [TrOCR](https://github.com/microsoft/unilm/tree/master/trocr)
* [IndicTrans2](https://github.com/AI4Bharat/IndicTrans2)
* [VITS RASA](https://huggingface.co/ai4bharat/vits_rasa_13)

---

## Contributors

| Contributor                                    | Contribution                               |
| ---------------------------------------------- | ------------------------------------------ |
| [**Kishore**](https://github.com/kishore-1754) | Backend, model setup, and data-flow design |
| [**Kushal SK**](https://github.com/kushalsk99) | Frontend design and backend integration    |

---

## Notes

* All required AI models are loaded when the server starts.
* The server therefore requires sufficient RAM to hold the loaded models.
* The ESP32 streaming endpoint is designed to avoid requiring the entire generated audio response to be held in ESP32 memory at once.
* Model access and licensing requirements are determined by the respective model providers.
