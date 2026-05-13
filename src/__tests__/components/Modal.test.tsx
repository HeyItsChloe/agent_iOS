import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalFooter } from '../../components/modals/Modal';

describe('Modal', () => {
  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('renders title correctly', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="My Custom Title">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByText('My Custom Title')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('shows close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      // Close button should be present
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('hides close button when showClose is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal" showClose={false}>
          <p>Content</p>
        </Modal>
      );
      
      // No buttons should be present in the header
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('backdrop', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      // Find the backdrop element
      const backdrop = container.querySelector('.absolute.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('keyboard events', () => {
    it('closes on Escape key press', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('sizes', () => {
    it('applies small size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" size="sm">
          <p>Content</p>
        </Modal>
      );
      
      const modal = container.querySelector('.max-w-sm');
      expect(modal).toBeInTheDocument();
    });

    it('applies medium size class by default', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      );
      
      const modal = container.querySelector('.max-w-md');
      expect(modal).toBeInTheDocument();
    });

    it('applies large size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" size="lg">
          <p>Content</p>
        </Modal>
      );
      
      const modal = container.querySelector('.max-w-lg');
      expect(modal).toBeInTheDocument();
    });

    it('applies xl size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" size="xl">
          <p>Content</p>
        </Modal>
      );
      
      const modal = container.querySelector('.max-w-xl');
      expect(modal).toBeInTheDocument();
    });
  });
});

describe('ModalFooter', () => {
  it('renders children', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Save</button>
      </ModalFooter>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('applies footer styling', () => {
    const { container } = render(
      <ModalFooter>
        <button>Action</button>
      </ModalFooter>
    );
    
    // Should have flex and justify-end classes
    const footer = container.querySelector('.flex.items-center.justify-end');
    expect(footer).toBeInTheDocument();
  });
});
