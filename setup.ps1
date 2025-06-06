Write-Host "🚀 Starting LearnSpark project setup..."

# Create backend structure
Write-Host "   -> Creating backend directories..."
New-Item -ItemType Directory -Force -Path "./backend/jobs", "./backend/endpoints" | Out-Null
New-Item -ItemType File -Force -Path "./backend/jobs/process-video.js", "./backend/endpoints/chat.js", "./backend/endpoints/create-quiz.js" | Out-Null
@"
{
  "name": "learnspark-backend",
  "version": "1.0.0",
  "description": "Backend for LearnSpark Hackathon",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  },
  "author": "",
  "license": "ISC"
}
"@ | Set-Content -Path "./backend/package.json"

# Create frontend structure
Write-Host "   -> Creating frontend directories..."
New-Item -ItemType Directory -Force -Path "./frontend/src/components", "./frontend/src/assets", "./frontend/public" | Out-Null
New-Item -ItemType File -Force -Path "./frontend/public/.gitkeep", "./frontend/src/components/VideoPlayer.jsx", "./frontend/src/components/ChatWindow.jsx", "./frontend/src/components/Quiz.jsx", "./frontend/src/assets/.gitkeep", "./frontend/src/App.jsx", "./frontend/src/index.css", "./frontend/src/main.jsx", "./frontend/.env.local", "./frontend/index.html", "./frontend/vite.config.js" | Out-Null
@"
{
  "name": "learnspark-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  }
}
"@ | Set-Content -Path "./frontend/package.json"

# Create root files
Write-Host "   -> Creating root project files..."
New-Item -ItemType File -Force -Path "./README.md" | Out-Null
@"
# LearnSpark 🚀

An AI-powered learning companion to chat with videos and generate quizzes.

## Project Structure

- `/backend`: Holds all Bolt.new serverless functions and jobs.
- `/frontend`: Holds the React + Vite user interface.
"@ | Set-Content -Path "./README.md"

@"
# Ignore dependencies and environment files
node_modules/
/frontend/dist
/frontend/.env.local
/frontend/.env

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
"@ | Set-Content -Path "./.gitignore"


Write-Host "✅ Project setup complete! You can now run 'git add .' and 'git commit'."