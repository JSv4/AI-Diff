import { useState } from 'react'
import { Workflow } from './components/workflow'
import styled from '@emotion/styled'

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f2f5 0%, #e2e6ea 100%);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    background: radial-gradient(circle, rgba(0, 102, 204, 0.03) 0%, transparent 70%);
    animation: rotate 60s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

const Header = styled.header`
  background: linear-gradient(to right, #1a1a1a, #2d2d2d);
  color: white;
  padding: 2rem 0;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #0066cc, #00a3cc, #0066cc);
    animation: shimmer 2s infinite linear;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`

const Title = styled.h1`
  font-size: 3.5rem;
  margin: 0;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #e6e6e6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
  position: relative;
  display: inline-block;
  
  &::after {
    content: 'LLM Redlines';
    position: absolute;
    left: 0;
    top: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    transform: translateX(2px) translateY(2px);
    z-index: -1;
  }
`

const Subtitle = styled.p`
  color: #b3b3b3;
  margin: 1rem 0 0;
  font-size: 1.2rem;
  font-weight: 400;
  
  span {
    background: linear-gradient(135deg, #0066cc, #00a3cc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 600;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -2px;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, #0066cc, #00a3cc);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }
    
    &:hover::after {
      transform: scaleX(1);
    }
  }
`

const Main = styled.main`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`

/**
 * Main App component that provides the layout and API key management for the Workflow
 */
function App() {
  // In a production app, you'd want to handle this more securely
  const [apiKey, setApiKey] = useState<string>('')
  const [isKeySet, setIsKeySet] = useState(false)

  const handleSubmitKey = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsKeySet(true)
  }

  const KeyForm = styled.form`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 
      0 4px 24px rgba(0, 0, 0, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.6) inset;
    max-width: 600px;
    margin: 3rem auto;
    gap: 1.5rem;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(135deg, #0066cc, #00a3cc);
      border-radius: 16px;
      z-index: -1;
      opacity: 0.1;
    }
  `

  const KeyInput = styled.input`
    width: 100%;
    padding: 16px 20px;
    border: 2px solid #eaeaea;
    border-radius: 12px;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.9);
    
    &:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1);
      transform: translateY(-1px);
    }
    
    &::placeholder {
      color: #a3a3a3;
    }
  `

  const KeyButton = styled.button`
    width: 100%;
    padding: 16px 24px;
    background: linear-gradient(135deg, #0066cc, #00a3cc);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transform: translateX(-100%);
    }
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 
        0 4px 24px rgba(0, 102, 204, 0.2),
        0 1px 0 rgba(255, 255, 255, 0.2) inset;
      
      &::before {
        transform: translateX(100%);
        transition: transform 0.6s ease;
      }
    }
    
    &:active {
      transform: translateY(0);
    }
  `

  return (
    <AppContainer>
      <Header>
        <Title>LLM Redlines</Title>
        <Subtitle>AI-Powered <span>Text Editor</span></Subtitle>
      </Header>
      
      <Main>
        {!isKeySet ? (
          <KeyForm onSubmit={handleSubmitKey}>
            <KeyInput
              type="password"
              placeholder="Enter your OpenAI API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <KeyButton type="submit">
              Start Editing
            </KeyButton>
          </KeyForm>
        ) : (
          <Workflow apiKey={apiKey} />
        )}
      </Main>
    </AppContainer>
  )
}

export default App
