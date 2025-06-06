import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>LearnSpark</h1>
      <p>AI-powered learning companion</p>
    </div>
  )
}

export default App