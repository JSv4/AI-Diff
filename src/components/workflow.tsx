import React, { FC, useState, useCallback } from 'react';
import { RedlineDiff } from './redline';
import { extractModifiedText } from '../utils/parse';
import MDEditor from '@uiw/react-md-editor';
import styled from '@emotion/styled';

/**
 * Props for the Workflow component
 */
interface WorkflowProps {
  apiKey: string;
}

/**
 * Represents a selected change in the diff
 */
interface SelectedChange {
  lineNumber: number;
  type: 'add' | 'remove';
  text: string;
}

/**
 * Possible states of the workflow
 */
type WorkflowState = 'input' | 'selection' | 'finalizing' | 'complete';

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

const StepIndicator = styled.div`
  display: flex;
  margin-bottom: 20px;
`;

const Step = styled.div<{ active: boolean }>`
  flex: 1;
  padding: 10px;
  text-align: center;
  background-color: ${({ active }) => (active ? '#0066cc' : '#cccccc')};
  color: white;
  border-radius: 4px;
  margin-right: 5px;

  &:last-of-type {
    margin-right: 0;
  }
`;

const ResetButton = styled.button`
  padding: 8px 16px;
  margin-left: 10px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

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

  /**
   * Steps in the workflow
   */
  const steps = [
    { label: 'Input', state: 'input' },
    { label: 'Selection', state: 'selection' },
    { label: 'Finalizing', state: 'finalizing' },
    { label: 'Complete', state: 'complete' },
  ];

  /**
   * Computes selected lines for the RedlineDiff component based on selectedChanges
   */
  const selectedLines = selectedChanges.map((change) => {
    const side = change.type === 'add' ? 'R' : 'L';
    return `${side}-${change.lineNumber}`;
  });

  /**
   * Handles line click events in the diff view
   * @param lineNumber - The line number that was clicked
   * @param type - The type of change ('add' or 'remove')
   */
  const handleLineClick = useCallback(
    (lineNumber: number, type: 'add' | 'remove') => {
      setSelectedChanges((prev) => {
        const exists = prev.some(
          (change) =>
            change.lineNumber === lineNumber && change.type === type
        );

        if (exists) {
          return prev.filter(
            (change) =>
              !(
                change.lineNumber === lineNumber && change.type === type
              )
          );
        }

        // Get the text from the appropriate version based on type
        const text =
          type === 'remove'
            ? inputText.split('\n')[lineNumber - 1]
            : modifiedText?.split('\n')[lineNumber - 1] || '';

        return [...prev, { lineNumber, type, text }];
      });
    },
    [inputText, modifiedText]
  );

  /**
   * Sends the initial edit request to the AI API
   */
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

  /**
   * Finalizes the selected changes by sending them to the AI API
   */
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
              content: 'You are going to be given text, and a list of changes to make to the text, specifically which lines to insert or delete. Your job is to take the original text and list of changes, and synthesize them into a modified form that is free of gramattical and syntax errors. Return only the modified text, as appropriate modified, omitting nothing. Lives are at stake and accuracy is critical.' // TODO: Replace with actual prompt template
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

  /**
   * Copies the final text to the clipboard
   */
  const copyToClipboard = () => {
    if (finalText) {
      navigator.clipboard.writeText(finalText);
    }
  };

  /**
   * Resets the workflow to the initial state
   */
  const resetWorkflow = () => {
    setInputText('');
    setPrompt('');
    setModifiedText(null);
    setFinalText(null);
    setSelectedChanges([]);
    setWorkflowState('input');
    setError(null);
  };

  return (
    <Container>
      {/* Step Indicator */}
      <StepIndicator>
        {steps.map((step, index) => (
          <Step key={index} active={workflowState === step.state}>
            {step.label}
          </Step>
        ))}
        <ResetButton onClick={resetWorkflow}>Reset</ResetButton>
      </StepIndicator>

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
            selectedLines={selectedLines}
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
          />
          <Button onClick={copyToClipboard}>
            Copy to Clipboard
          </Button>
        </>
      )}
    </Container>
  );
};
