# Getting Started

This guide explains how to set up and run the FastAPI backend using [uv](https://github.com/astral-sh/uv), a fast Python package manager.

## Important Notice:
> **⚠️ Important:**
> Don't forget to create a `.env` file in the directory and set the `OPENAI_API_KEY` variable.
> Example:
> OPENAI_API_KEY=`your_openai_api_key_here`

## Prerequisites

- Python 3.13 or newer installed [Python official page](https://www.python.org/downloads/)
- [uv](https://github.com/astral-sh/uv) installed, see [Install 'uv'](#1-install-uv)

## Environment variables
To make sure the terminal can find your python and uv executables, you need to add the paths to your environment variables.

Assuming your python.exe file located at: `C:\Users\<username>\AppData\Local\Programs\Python\Python3.13\python.exe`

You should add the following to your 'PATH' environment variable:
```bash
C:\Users\<username>\AppData\Local\Programs\Python\Python3.13
C:\Users\<username>\AppData\Local\Programs\Python\Python3.13\Scripts
``` 

For more help you can see the following video: [How to add Python to PATH on Windows](https://www.youtube.com/watch?v=91SGaK7_eeY)



## 1. Install `uv`

#### Using pip

```bash
python -m pip install uv
```

#### Using the installer

[uv official page](https://docs.astral.sh/uv/getting-started/installation/).


## 2. Install Project Dependencies

```bash
uv sync
```

## 3. Run the FastAPI Application

```bash
uv run fastapi run app.py
```

## 4. Access the API

Open your browser and go to: [http://127.0.0.1:8000](http://127.0.0.1:8000)

The interactive API docs are available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 5. Add new dependencies

```bash
uv add <package_name>
```
