import { describe, it, expect } from 'vitest';
import { ok, err, DomainError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from './Result';
import { Money } from './Money';

describe('Result', () => {
  it('ok creates success result', () => {
    const result = ok(42);
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.error).toBeUndefined();
  });

  it('err creates failure result', () => {
    const error = new ValidationError('Invalid');
    const result = err(error);
    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(result.data).toBeUndefined();
  });
});

describe('DomainError', () => {
  it('has correct properties', () => {
    const error = new DomainError('Test error', 'TEST_ERROR', 418);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(418);
    expect(error.name).toBe('DomainError');
  });
});

describe('NotFoundError', () => {
  it('formats message correctly', () => {
    const error = new NotFoundError('User');
    expect(error.message).toBe('User not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });
});

describe('ValidationError', () => {
  it('has correct defaults', () => {
    const error = new ValidationError('Bad input');
    expect(error.message).toBe('Bad input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
  });
});

describe('UnauthorizedError', () => {
  it('has correct defaults', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
  });

  it('accepts custom message', () => {
    const error = new UnauthorizedError('Token expired');
    expect(error.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has correct defaults', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Forbidden');
    expect(error.statusCode).toBe(403);
  });
});

describe('Money', () => {
  it('creates from amount', () => {
    const money = new Money(100.50, 'USD');
    expect(money.amount).toBe(100.50);
    expect(money.currency).toBe('USD');
  });

  it('rejects negative amount', () => {
    expect(() => new Money(-10)).toThrow('Money amount cannot be negative');
  });

  it('converts from cents', () => {
    const money = Money.fromCents(1000, 'USD');
    expect(money.amount).toBe(10);
    expect(money.toCents()).toBe(1000);
  });

  it('adds same currency', () => {
    const a = new Money(100, 'USD');
    const b = new Money(50, 'USD');
    expect(a.add(b).amount).toBe(150);
  });

  it('rejects adding different currencies', () => {
    const a = new Money(100, 'USD');
    const b = new Money(50, 'EUR');
    expect(() => a.add(b)).toThrow('Cannot add money with different currencies');
  });

  it('formats correctly', () => {
    const money = new Money(1234.56, 'USD');
    expect(money.format()).toBe('$1,234.56');
  });

  it('checks equality', () => {
    const a = new Money(100, 'USD');
    const b = new Money(100, 'USD');
    const c = new Money(200, 'USD');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
