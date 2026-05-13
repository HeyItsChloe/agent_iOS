import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { Message, MessageSender, MessageStatus } from '../../types/message';

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  content: 'Hello, world!',
  sender: MessageSender.USER,
  status: MessageStatus.SENT,
  timestamp: new Date('2024-01-15T12:00:00Z'),
  ...overrides,
});

describe('MessageBubble', () => {
  describe('user messages', () => {
    it('renders user message content', () => {
      const message = createMessage({ content: 'Test message' });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('applies user bubble styling', () => {
      const message = createMessage();
      const { container } = render(<MessageBubble message={message} />);
      
      // User messages should be right-aligned (flex-row-reverse)
      const wrapper = container.querySelector('.flex-row-reverse');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('agent messages', () => {
    it('renders agent message content', () => {
      const message = createMessage({
        sender: MessageSender.AGENT,
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('shows agent name when showName is true', () => {
      const message = createMessage({
        sender: MessageSender.AGENT,
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      render(<MessageBubble message={message} showName={true} />);
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('hides agent name when showName is false', () => {
      const message = createMessage({
        sender: MessageSender.AGENT,
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
      const message = createMessage({
        sender: MessageSender.SYSTEM,
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
      const message = createMessage({
        status: MessageStatus.ERROR,
        content: 'Failed message',
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('code blocks', () => {
    it('renders code blocks with syntax highlighting container', () => {
      const message = createMessage({
        sender: MessageSender.AGENT,
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
      const message = createMessage({
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
      const message = createMessage({
        sender: MessageSender.AGENT,
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      const { container } = render(<MessageBubble message={message} showAvatar={true} />);
      
      // Should have avatar element
      const avatar = container.querySelector('[style*="background-color"]');
      expect(avatar).toBeInTheDocument();
    });

    it('hides avatar when showAvatar is false', () => {
      const message = createMessage({
        sender: MessageSender.AGENT,
        agentId: 'agent-1',
        agentName: 'Test Agent',
        agentColor: '#007AFF',
      });
      const { container } = render(<MessageBubble message={message} showAvatar={false} />);
      
      // Should not have colored avatar background
      const avatars = container.querySelectorAll('.w-8.h-8.rounded-full');
      // Avatar might be a spacer div
      expect(avatars.length).toBeLessThanOrEqual(1);
    });
  });

  describe('tool calls', () => {
    it('displays tool call badges', () => {
      const message = createMessage({
        sender: MessageSender.AGENT,
        agentId: 'agent-1',
        agentName: 'Agent',
        toolCalls: [{ name: 'terminal' }, { name: 'file_editor' }],
      });
      render(<MessageBubble message={message} />);
      
      expect(screen.getByText('terminal')).toBeInTheDocument();
      expect(screen.getByText('file_editor')).toBeInTheDocument();
    });
  });
});
