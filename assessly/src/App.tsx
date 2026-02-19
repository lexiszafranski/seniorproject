import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './styles/App.css'
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard'
import Login from './pages/login';


function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} /> 
      </Routes>
    </HashRouter>
  )
}
export default App

// Testing 
// http://localhost:<your local host num>/#/login
