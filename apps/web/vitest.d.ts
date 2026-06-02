/// <reference types="vitest/globals" />
// Registers the @testing-library/jest-dom matchers (toBeInTheDocument,
// toHaveAttribute, ...) on vitest's Assertion type so `tsc` type-checks the
// RTL component tests.
import '@testing-library/jest-dom/vitest';
