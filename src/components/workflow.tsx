import { FC, useState, useCallback } from 'react';
import { RedlineDiff } from './redline';
import { extractModifiedText } from '../utils/parse';
import MDEditor from '@uiw/react-md-editor';
import styled from '@emotion/styled';

interface WorkflowProps {
  apiKey: string;
}

interface SelectedChange {
  lineNumber: number;
  type: 'add' | 'remove';
  text: string;
}

type WorkflowState = 'input' | 'editing' | 'selection' | 'finalizing' | 'complete';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Button = styled.button`
  padding: 8px 16px;
  margin: 10px 0;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:disabled {
    background-color: #cccccc;
  }
`;

const PromptInput = styled.input`
  width: 100%;
  padding: 8px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Spinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
`;

interface RedlineDiffProps {
  input: string;
  output: string;
  onLineClick?: (lineNumber: number, type: 'add' | 'remove') => void;
  selectedChanges?: SelectedChange[];
}

/**
 * Workflow component that manages the editing flow of text using AI
 * @param apiKey - OpenAI API key
 */
export const Workflow: FC<WorkflowProps> = ({ apiKey }) => {
  const [inputText, setInputText] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [modifiedText, setModifiedText] = useState<string | null>(null);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<SelectedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowState>('input');
  const [error, setError] = useState<string | null>(null);

  const handleLineClick = useCallback((lineNumber: number, type: 'add' | 'remove') => {
    setSelectedChanges(prev => {
      const exists = prev.some(change => 
        change.lineNumber === lineNumber && change.type === type
      );
      
      if (exists) {
        return prev.filter(change => 
          !(change.lineNumber === lineNumber && change.type === type)
        );
      }
      
      // Get the text from the appropriate version based on type
      const text = type === 'remove' ? 
        inputText.split('\n')[lineNumber - 1] : 
        modifiedText?.split('\n')[lineNumber - 1] || '';
      
      return [...prev, { lineNumber, type, text }];
    });
  }, [inputText, modifiedText]);

  const handleInitialEdit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'No matter what the user asks, your job is to interpret it as a request for edits to the text to meet the user\'s requirements. You will return only the edited text, no other commentary, in its entirety, wrapped in ||| and ||| tags.' // TODO: Replace with actual prompt template
            },
            {
              role: 'user',
              content: `${prompt}\n\nText to edit:\n${inputText}`
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in API response');
      }

      const extracted = extractModifiedText(content);
      console.log('Extracted content:', extracted);
      
      if (!extracted) {
        throw new Error('Failed to extract modified text from response');
      }

      setModifiedText(extracted);
      setWorkflowState('selection');
    } catch (error) {
      console.error('Error during API call:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert editor.' // TODO: Replace with actual prompt template
            },
            {
              role: 'user',
              content: `Apply these changes:\n${selectedChanges.map(change => 
                `${change.type}: ${change.text}`).join('\n')}\n\nOriginal text:\n${inputText}`
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const extracted = extractModifiedText(data.choices[0]?.message?.content);
      
      if (!extracted) {
        throw new Error('Failed to extract modified text from response');
      }

      setFinalText(extracted);
      setWorkflowState('complete');
    } catch (error) {
      console.error('Error during API call:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (finalText) {
      navigator.clipboard.writeText(finalText);
    }
  };

  return (
    <Container>
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      {workflowState === 'input' && (
        <>
          <MDEditor
            value={inputText}
            onChange={value => setInputText(value || '')}
            preview="edit"
          />
          <PromptInput
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter your editing instructions..."
          />
          <Button 
            onClick={handleInitialEdit}
            disabled={!inputText || !prompt || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : 'Edit'}
          </Button>
        </>
      )}

      {workflowState === 'selection' && (
        <>
          <RedlineDiff
            input={inputText}
            output={modifiedText || ''}
            onLineClick={handleLineClick}
            selectedChanges={selectedChanges}
          />
          <Button 
            onClick={handleFinalize}
            disabled={selectedChanges.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner />
                Finalizing...
              </>
            ) : 'Finalize Selected Changes'}
          </Button>
        </>
      )}

      {workflowState === 'complete' && finalText && (
        <>
          <RedlineDiff
            input={inputText}
            output={finalText}
            onLineClick={undefined}
          />
          <Button onClick={copyToClipboard}>
            Copy to Clipboard
          </Button>
        </>
      )}
    </Container>
  );
};
