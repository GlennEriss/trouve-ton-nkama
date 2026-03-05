/**
 * SignupFormWrapper Component Tests
 * 
 * Tests for the SignupFormWrapper component (V1)
 */

import { describe, it, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignupFormWrapper } from '../SignupFormWrapper';

// Mock LayoutAuth
jest.mock('@/components/layouts/LayoutAuth', () => ({
  LayoutAuth: ({ children, type }: { children: React.ReactNode; type: string }) => (
    <div data-testid="layout-auth" data-type={type}>
      {children}
    </div>
  ),
}));

// Mock SignupForm
jest.mock('../SignupForm', () => ({
  SignupForm: ({ onLoadingChange }: { onLoadingChange: (loading: boolean) => void }) => (
    <div data-testid="signup-form">SignupForm</div>
  ),
}));

describe('SignupFormWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render LayoutAuth with Signup type', () => {
    render(<SignupFormWrapper />);
    
    const layoutAuth = screen.getByTestId('layout-auth');
    expect(layoutAuth).toBeInTheDocument();
    expect(layoutAuth).toHaveAttribute('data-type', 'Signup');
  });

  it('should render SignupForm inside LayoutAuth', () => {
    render(<SignupFormWrapper />);
    
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });
});
