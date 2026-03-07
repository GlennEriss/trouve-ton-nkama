import { resolveAccountActivityPolicy } from '../account-activity-policy';

describe('resolveAccountActivityPolicy', () => {
  it('forces in-app + email for critical events even when preference is disabled', () => {
    const policy = resolveAccountActivityPolicy(
      'ACCOUNT_PASSWORD_CHANGED',
      false
    );

    expect(policy.severity).toBe('CRITICAL');
    expect(policy.sendInApp).toBe(true);
    expect(policy.sendEmail).toBe(true);
  });

  it('enables in-app and disables email for non-critical events when preference is enabled', () => {
    const policy = resolveAccountActivityPolicy(
      'ACCOUNT_PROFILE_UPDATED',
      true
    );

    expect(policy.severity).toBe('LOW');
    expect(policy.sendInApp).toBe(true);
    expect(policy.sendEmail).toBe(false);
  });

  it('skips all channels for non-critical events when preference is disabled', () => {
    const policy = resolveAccountActivityPolicy(
      'ACCOUNT_PHONE_CHANGED',
      false
    );

    expect(policy.severity).toBe('MEDIUM');
    expect(policy.sendInApp).toBe(false);
    expect(policy.sendEmail).toBe(false);
    expect(policy.reason).toBe('account_activity_disabled');
  });
});

