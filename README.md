chạy  backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

chạy crawl 
uvicorn main:app --reload --host 127.0.0.1 --port 8002