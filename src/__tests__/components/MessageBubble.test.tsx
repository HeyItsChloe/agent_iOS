import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../../components/chat/MessageBubble';
import type { Message } from '../../types/message';

// Helper to create a test message
function createTestMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    content: 'Hello, world!',
    sender: 'user',
    status: 'sent',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    subAgentResults: [],
    ...overrides,
  };
}

describe('MessageBubble', () => {
  describe('user messages', () => {
    it('renders user message content', () => {
      const message = createTestMessage({ content: 'Test message' });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('applies user bubble styling (right aligned)', () => {
      const message = createTestMessage();
      const { container } = render(<MessageBubble message={message} />);
      
      // User messages should be right-aligned (flex-row-reverse)
      const wrapper = container.querySelector('.flex-row-reverse');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('agent messages', () => {
    it('renders agent message content', () => {
      const message = createTestMessage({
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('shows agent name when showName is true', () => {
      const message = createTestMessage({
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      render(<MessageBubble message={message} showName={true} />);
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('hides agent name when showName is false', () => {
      const message = createTestMessage({
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      render(<MessageBubble message={message} showName={false} />);
      
      expect(screen.queryByText('Test Agent')).not.toBeInTheDocument();
    });
  });

  describe('system messages', () => {
    it('renders system message centered', () => {
      const message = createTestMessage({
        sender: 'system',
        content: 'User joined the chat',
      });
      const { container } = render(<MessageBubble message={message} />);
      
      // System messages should be centered
      const wrapper = container.querySelector('.justify-center');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('error messages', () => {
    it('shows error indicator for error status', () => {
      const message = createTestMessage({
        status: 'error',
        content: 'Failed message',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('code blocks', () => {
    it('renders code blocks with syntax highlighting container', () => {
      const message = createTestMessage({
        sender: 'agent',
        content: 'Here is some code:\n```javascript\nconst x = 1;\n```',
        agentId: 'agent-1',
        agentName: 'Agent',
      });
      const { container } = render(<MessageBubble message={message} />);
      
      // Should have a pre element for code
      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
    });
  });

  describe('timestamps', () => {
    it('displays message timestamp', () => {
      const message = createTestMessage({
        timestamp: new Date('2024-01-15T14:30:00Z'),
      });
      render(<MessageBubble message={message} />);
      
      // Should show time (format varies by locale)
      const timeText = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timeText).toBeInTheDocument();
    });
  });

  describe('avatar', () => {
    it('shows avatar when showAvatar is true for agent messages', () => {
      const message = createTestMessage({
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      const { container } = render(<MessageBubble message={message} showAvatar={true} />);
      
      // Should have avatar element with background color
      const avatar = container.querySelector('[style*="background"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('sub-agent results', () => {
    it('displays sub-agent results when present', () => {
      const message = createTestMessage({
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Delegator',
        subAgentResults: [
          {
            agentId: 'sub-1',
            agentName: 'Sub Agent 1',
            icon: '🔧',
            content: 'Sub agent response',
          },
        ],
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Sub Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Sub agent response')).toBeInTheDocument();
    });
  });

  describe('sending status', () => {
    it('shows sending indicator', () => {
      const message = createTestMessage({
        status: 'sending',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Sending')).toBeInTheDocument();
    });

    it('shows sent indicator', () => {
      const message = createTestMessage({
        status: 'sent',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });

    it('shows delivered indicator', () => {
      const message = createTestMessage({
        status: 'delivered',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });
  });
});
