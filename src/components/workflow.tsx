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
  padding: 2rem;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  border-radius: 16px;
  position: relative;
  z-index: 0;
`;

const Button = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #0066cc, #0052a3);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.2);
  }
  
  &:disabled {
    background: linear-gradient(135deg, #e0e0e0, #d0d0d0);
    cursor: not-allowed;
    opacity: 0.8;
  }
`;

const PromptInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  margin: 12px 0;
  border: 2px solid #eaeaea;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: #a3a3a3;
  }
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
  background-color: #fff5f5;
  border: 1px solid #ffebeb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: "⚠️";
  }
`;

const StepIndicator = styled.div`
  display: flex;
  margin: 0 0 3rem;
  position: relative;
  padding: 0 1rem;
  pointer-events: none;
  
  & > * {
    pointer-events: auto;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: #e0e0e0;
    z-index: 0;
  }
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  
  &::before {
    content: attr(data-step);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${({ active, completed }) =>
      active
        ? 'linear-gradient(135deg, #0066cc, #0052a3)'
        : completed
        ? 'linear-gradient(135deg, #00cc88, #00a36f)'
        : '#f0f0f0'};
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ active, completed }) =>
      active || completed ? 'white' : '#666'};
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    box-shadow: ${({ active, completed }) =>
      active || completed
        ? '0 4px 12px rgba(0, 102, 204, 0.2)'
        : '0 2px 4px rgba(0, 0, 0, 0.05)'};
    border: 4px solid ${({ active }) =>
      active ? '#ffffff' : 'transparent'};
  }

  ${({ completed }) =>
    completed &&
    `
    &::after {
      content: '✓';
      color: white;
      font-size: 1.2rem;
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
    }
  `}

  span {
    font-size: 0.9rem;
    font-weight: 500;
    color: ${({ active }) => (active ? '#0066cc' : '#666')};
    margin-top: 0.5rem;
    transition: all 0.3s ease;
  }
`;

const ResetButton = styled.button`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  padding: 8px 16px;
  background: linear-gradient(135deg, #dc3545, #b02a37);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-50%) translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
  }
  
  &:active {
    transform: translateY(-50%) translateY(0);
  }
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
    { label: 'Input', state: 'input', number: '1' },
    { label: 'Selection', state: 'selection', number: '2' },
    { label: 'Finalizing', state: 'finalizing', number: '3' },
    { label: 'Complete', state: 'complete', number: '4' },
  ];

  /**
   * Computes selected lines for the RedlineDiff component based on selectedChanges
   */
  const selectedLines = selectedChanges.map((change) => {
    const side = change.type === 'add' ? 'R' : 'L';
    return `${side}-${change.lineNumber}`;
  });

  /**
   * Handles line click events in the diff view.
   * Ensures that only one change per line can be selected.
   * @param lineNumber - The line number that was clicked.
   * @param type - The type of change ('add' or 'remove').
   */
  const handleLineClick = useCallback(
    (lineNumber: number, type: 'add' | 'remove') => {
      setSelectedChanges((prev) => {
        // Remove any existing change at this line number
        const updatedChanges = prev.filter(
          (change) => change.lineNumber !== lineNumber
        );

        // Determine if the current change was already selected
        const wasSelected = prev.some(
          (change) =>
            change.lineNumber === lineNumber && change.type === type
        );

        // If the change was not selected before, add it
        if (!wasSelected) {
          // Get the text from the appropriate version based on type
          const text =
            type === 'remove'
              ? inputText.split('\n')[lineNumber - 1]
              : modifiedText?.split('\n')[lineNumber - 1] || '';

          return [...updatedChanges, { lineNumber, type, text }];
        }

        // If it was already selected, return the updated changes without adding it (deselect)
        return updatedChanges;
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
   * Finalizes the selected changes by processing the user's selections
   * and sending them to the AI API to generate the final text.
   */
  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Split the input and modified texts into arrays of lines
      const inputLines = inputText.split('\n');
      const modifiedLines = modifiedText ? modifiedText.split('\n') : [];

      // Create a map for quick lookup of selected changes
      const selectedChangesMap = new Map<string, boolean>();
      selectedChanges.forEach((change) => {
        const key = `${change.type}-${change.lineNumber}`;
        selectedChangesMap.set(key, true);
      });

      // Build the desired lines array
      const desiredLines: string[] = [];
      let inputIndex = 0;
      let modifiedIndex = 0;

      while (inputIndex < inputLines.length || modifiedIndex < modifiedLines.length) {
        const inputLine = inputLines[inputIndex];
        const modifiedLine = modifiedLines[modifiedIndex];

        // Determine if the current line is an addition, deletion, or unchanged
        const isAddition = modifiedLine && (!inputLine || modifiedLine !== inputLine);
        const isDeletion = inputLine && (!modifiedLine || modifiedLine !== inputLine);
        const lineNumber = Math.max(inputIndex, modifiedIndex) + 1;

        if (isAddition) {
          const key = `add-${lineNumber}`;
          if (selectedChangesMap.get(key)) {
            // Include the added line from modified text
            desiredLines.push(modifiedLine);
          }
          modifiedIndex++;
        } else if (isDeletion) {
          const key = `remove-${lineNumber}`;
          if (!selectedChangesMap.get(key)) {
            // Include the original line if not selected for removal
            desiredLines.push(inputLine);
          }
          inputIndex++;
        } else {
          // Unchanged line, include from original text
          desiredLines.push(inputLine);
          inputIndex++;
          modifiedIndex++;
        }
      }

      // Prepare the prompt for the AI model
      const aiPrompt = `
Here is a list of lines in the desired order for the final text:

${desiredLines.map((line, index) => `${index + 1}: ${line}`).join('\n')}

Please combine these lines into a coherent document, making only minimal changes necessary for grammatical and syntactical correctness. Return the complete text without omitting any content.
`;

      // Call the AI API with the prepared prompt
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
              content: 'You are given a list of text lines in order. Your task is to combine these lines into a coherent and grammatically correct document. Make only minimal changes necessary for correctness.'
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in API response');
      }

      // Extract the final text from the AI's response
      const extracted = extractModifiedText(content);
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
        {steps.map((step, index) => {
          const isCompleted = 
            steps.findIndex(s => s.state === workflowState) > index;
          const isActive = workflowState === step.state;
          
          return (
            <Step 
              key={index} 
              active={isActive} 
              completed={isCompleted}
              data-step={step.number}
            >
              <span>{step.label}</span>
            </Step>
          );
        })}
        <ResetButton onClick={resetWorkflow}>
          Reset
        </ResetButton>
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
