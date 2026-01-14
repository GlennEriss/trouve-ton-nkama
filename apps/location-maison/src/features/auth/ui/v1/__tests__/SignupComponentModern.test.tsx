/**
 * SignupComponentModern Component Tests
 * 
 * Tests for the SignupComponentModern component (V1)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SignupComponentModern } from '../SignupComponentModern';

// Mock useWindowSize
jest.mock('@/hooks/useSize', () => ({
  useWindowSize: jest.fn(),
}));

// Mock SignupFormModern
jest.mock('../SignupFormModern', () => ({
  SignupFormModern: () => <div data-testid="signup-form-modern">SignupFormModern</div>,
}));

// Mock SignupMobileComponent
jest.mock('@/components/signup/SignupMobileComponent', () => ({
  SignupMobileComponent: () => <div data-testid="signup-mobile">SignupMobileComponent</div>,
}));

import { useWindowSize } from '@/hooks/useSize';

describe('SignupComponentModern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render SignupFormModern for desktop (width > 768)', () => {
    (useWindowSize as jest.MockedFunction<typeof useWindowSize>).mockReturnValue({
      width: 1024,
      height: 768,
    });

    render(<SignupComponentModern />);
    
    expect(screen.getByTestId('signup-form-modern')).toBeInTheDocument();
    expect(screen.queryByTestId('signup-mobile')).not.toBeInTheDocument();
  });

  it('should render SignupMobileComponent for mobile (width <= 768)', () => {
    (useWindowSize as jest.MockedFunction<typeof useWindowSize>).mockReturnValue({
      width: 768,
      height: 1024,
    });

    render(<SignupComponentModern />);
    
    expect(screen.getByTestId('signup-mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('signup-form-modern')).not.toBeInTheDocument();
  });

  it('should render SignupMobileComponent for small screens (width < 768)', () => {
    (useWindowSize as jest.MockedFunction<typeof useWindowSize>).mockReturnValue({
      width: 375,
      height: 667,
    });

    render(<SignupComponentModern />);
    
    expect(screen.getByTestId('signup-mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('signup-form-modern')).not.toBeInTheDocument();
  });
});
