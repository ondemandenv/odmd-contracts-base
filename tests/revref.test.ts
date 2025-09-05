// Lifecycle-aligned tests; no heavy module mocks required
import { SRC_Rev_REF } from '../lib/model/odmd-build';

describe('SRC_Rev_REF', () => {
    test('toPathPartStr without origin', () => {
        const r = new SRC_Rev_REF('b', 'dev');
        expect(r.toPathPartStr()).toBe('b..dev');
    });

    test('toPathPartStr with origin chains correctly', () => {
        const origin = new SRC_Rev_REF('b', 'main');
        const r = new SRC_Rev_REF('t', 'v1.0.0', origin);
        expect(r.toPathPartStr()).toBe('b..main-_' + 't..v1.0.0');
    });

    test('rejects reserved sequences and invalid branch prefix', () => {
        expect(() => new SRC_Rev_REF('b', 'v1')).toThrow();
        expect(() => new SRC_Rev_REF('b', 'bad..value')).toThrow();
        expect(() => new SRC_Rev_REF('b', 'bad-__value')).toThrow();
        expect(() => new SRC_Rev_REF('b', 'bad_-value')).toThrow();
        expect(() => new SRC_Rev_REF('b', 'bad-_value')).toThrow();
    });
});

