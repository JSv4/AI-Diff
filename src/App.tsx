import { useState } from 'react'
import { Workflow } from './components/workflow'
import styled from '@emotion/styled'

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`

const Header = styled.header`
  background-color: #1a1a1a;
  color: white;
  padding: 1rem 0;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  font-weight: 600;
`

const Subtitle = styled.p`
  color: #cccccc;
  margin: 0.5rem 0 0;
  font-size: 1rem;
`

const Main = styled.main`
  padding: 2rem 1rem;
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

  const KeyInput = styled.input`
    padding: 8px 16px;
    margin-right: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 300px;
  `

  const KeyButton = styled.button`
    padding: 8px 16px;
    background-color: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `

  const KeyForm = styled.form`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    gap: 1rem;
  `

  return (
    <AppContainer>
      <Header>
        <Title>LLM Redlines</Title>
        <Subtitle>AI-Powered Text Editor</Subtitle>
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
