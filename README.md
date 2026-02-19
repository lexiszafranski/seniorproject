# Assessly: Automated Practice Question Generation

## Running the Frontend

1. Navigate to the Assessly directory:
   ```
   cd Assessly
   ```

2. Install any necessary dependencies:
   ```
   npm i
   ```
   
3. Running the project
   ```
   npm run dev
   ```
4. To see login page, change browser url to:  http://localhost:<your local host num>/#/login

## Running the Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Create a `.env` file in `backend/` with your keys:
   ```
   CLERK_SECRET_KEY=your_clerk_secret_key
   CANVAS_TOKEN=your_canvas_api_token
   ```

4. Run the server:
   ```
   uvicorn main:app --reload
   ```

5. Open `http://localhost:8000/docs` to view and test the API endpoints.

Note: Every time you open a new terminal, activate the venv first with `source venv/bin/activate` before running the server.
