import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

if (!globalThis.TextEncoder) {
	Object.defineProperty(globalThis, 'TextEncoder', {
		value: TextEncoder,
		writable: true,
	});
}

if (!globalThis.TextDecoder) {
	Object.defineProperty(globalThis, 'TextDecoder', {
		value: TextDecoder,
		writable: true,
	});
}
