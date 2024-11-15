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
 * Possible states of the workflow
 */

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
    z-index: -1;
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
  z-index: 10;
  
  &:hover {
    transform: translateY(-50%) translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
  }
  
  &:active {
    transform: translateY(-50%) translateY(0);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

/**
 * Workflow component that manages the editing flow of text using AI
 * @param apiKey - OpenAI API key
 */
export const Workflow: FC<WorkflowProps> = ({ apiKey }) => {
  type WorkflowState = 'input' | 'selection' | 'finalizing' | 'review' | 'complete';

  const [workflowState, setWorkflowState] = useState<WorkflowState>('input');
  const [prompt, setPrompt] = useState<string>('');
  const [inputText, setInputText] = useState<string>('Your original text...');
  const [modifiedText, setModifiedText] = useState<string>('');
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [selectedLineContents, setSelectedLineContents] = useState<Map<string, string>>(new Map());
  const [finalText, setFinalText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Steps in the workflow
   */
  const steps = [
    { label: 'Input', state: 'input', number: '1' },
    { label: 'Selection', state: 'selection', number: '2' },
    { label: 'Finalize', state: 'finalizing', number: '3' },
    { label: 'Review', state: 'review', number: '4' },
    { label: 'Complete', state: 'complete', number: '5' },
  ];

  /**
   * Handles line number click events in the diff view.
   * @param lineId - The line ID (e.g., 'L-3' or 'R-5').
   * @param content - The content of the line.
   */
  const handleLineNumberClick = useCallback(
    (lineId: string, content: string) => {
      setSelectedLines((prevSelectedLines) => {
        const newSelectedLines = new Set(prevSelectedLines);
        if (newSelectedLines.has(lineId)) {
          newSelectedLines.delete(lineId);
          setSelectedLineContents((prevContents) => {
            const newContents = new Map(prevContents);
            newContents.delete(lineId);
            return newContents;
          });
        } else {
          newSelectedLines.add(lineId);
          setSelectedLineContents((prevContents) => {
            const newContents = new Map(prevContents);
            newContents.set(lineId, content);
            return newContents;
          });
        }
        return newSelectedLines;
      });
    },
    []
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
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'No matter what the user asks, your job is to interpret it as a request for edits to the text to meet the user\'s requirements. You will return only the edited text, no other commentary, in its entirety, wrapped in ||| and ||| tags.',
            },
            {
              role: 'user',
              content: `${prompt}\n\nText to edit:\n${inputText}`,
            },
          ],
        }),
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
   * and generating the final text using an LLM.
   */
  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);
    setWorkflowState('finalizing');
    try {
      // Prepare the selected lines for the LLM
      const selectedLinesArray = Array.from(selectedLineContents.values());
      const selectedText = selectedLinesArray.join('\n');

      // Send the selected lines to the LLM to combine into a single output
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Your job is to combine the provided changed lines into a final edited text, ensuring coherence and readability. Return the full edited text, wrapped in ||| and |||.',
            },
            {
              role: 'user',
              content: `Selected changes:\n${selectedText}\n\nOriginal text:\n${inputText}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('LLM Finalization Response:', data);

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      const finalEditedText = extractModifiedText(content);
      console.log('Final Edited Text:', finalEditedText);

      if (!finalEditedText) {
        throw new Error('Failed to extract final text from LLM response');
      }

      setFinalText(finalEditedText);
      setWorkflowState('review');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while finalizing.');
      setWorkflowState('selection');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Proceeds to the complete state after the user reviews the final text
   */
  const handleComplete = () => {
    setWorkflowState('complete');
  };

  /**
   * Returns to the selection state from review
   */
  const handleBackToSelection = () => {
    setWorkflowState('selection');
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
    setInputText('Your original text...');
    setPrompt('');
    setModifiedText('');
    setFinalText('');
    setSelectedLines(new Set());
    setSelectedLineContents(new Map());
    setWorkflowState('input');
    setError(null);
  };

  return (
    <Container>
      {/* Step Indicator */}
      <StepIndicator>
        {steps.map((step, index) => {
          const currentStepIndex = steps.findIndex((s) => s.state === workflowState);
          const isCompleted = currentStepIndex > index;
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
        <ResetButton onClick={resetWorkflow}>Reset</ResetButton>
      </StepIndicator>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {workflowState === 'input' && (
        <>
          <MDEditor
            value={inputText}
            onChange={(value) => setInputText(value || '')}
            preview="edit"
          />
          <PromptInput
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
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
            ) : (
              'Edit'
            )}
          </Button>
        </>
      )}

      {workflowState === 'selection' && (
        <>
          <RedlineDiff
            oldValue={inputText}
            newValue={modifiedText}
            onLineNumberClick={handleLineNumberClick}
            selectedLines={selectedLines}
          />
          <Button
            onClick={handleFinalize}
            disabled={isLoading || selectedLines.size === 0}
          >
            {isLoading ? (
              <>
                <Spinner />
                Finalizing...
              </>
            ) : (
              'Finalize Selected Changes'
            )}
          </Button>
        </>
      )}

      {workflowState === 'finalizing' && (
        <Button disabled>
          <Spinner />
          Finalizing...
        </Button>
      )}

      {workflowState === 'review' && finalText && (
        <>
          <RedlineDiff
            oldValue={inputText}
            newValue={finalText}
            onLineNumberClick={() => {}}
            selectedLines={new Set()}
          />
          <ButtonGroup>
            <Button onClick={handleBackToSelection}>
              Back to Selection
            </Button>
            <Button onClick={handleComplete}>
              Proceed to Final Text
            </Button>
          </ButtonGroup>
        </>
      )}

      {workflowState === 'complete' && finalText && (
        <>
          <MDEditor value={finalText} preview="edit" />
          <Button onClick={copyToClipboard}>Copy to Clipboard</Button>
        </>
      )}
    </Container>
  );
};
