export class Money {
  constructor(
    readonly amount: number,
    readonly currency: string = 'USD',
  ) {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
  }

  static fromCents(cents: number, currency = 'USD'): Money {
    return new Money(cents / 100, currency);
  }

  toCents(): number {
    return Math.round(this.amount * 100);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Money subtraction would result in negative amount');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Cannot multiply money by negative factor');
    }
    return new Money(this.amount * factor, this.currency);
  }

  format(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }
}
