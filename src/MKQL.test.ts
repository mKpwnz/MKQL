import { describe, expect, it } from 'bun:test';
import { MKQL } from './MKQL';
import { z } from 'zod';

const IAssetSchema = z.object({
    id: z.string(),
    name: z.string(),
    ou: z.string(),
    sku: z.number(),
    useSync: z.boolean(),
    syncOrder: z.enum(['ASC', 'DSC', 'ELSEWHERE']),
});

type IAsset = z.infer<typeof IAssetSchema>;

const assets: IAsset[] = [
    { id: '1', name: 'Alice', ou: 'Sales', sku: 150, useSync: true, syncOrder: 'ASC' },
    { id: '2', name: 'Bob', ou: 'Marketing', sku: 200, useSync: false, syncOrder: 'DSC' },
    { id: '3', name: 'Charlie', ou: 'Sales', sku: 50, useSync: true, syncOrder: 'ELSEWHERE' },
];

describe('MKQL Query Language Tests', () => {
    it('should filter assets by name', () => {
        const query = `USE WHERE name = "Alice" END USE;`;
        const filterFunction = MKQL.parse<typeof IAssetSchema>(query, IAssetSchema);

        const filteredAssets = assets.filter(filterFunction);
        expect(filteredAssets).toEqual([{
            id: '1',
            name: 'Alice',
            ou: 'Sales',
            sku: 150,
            useSync: true,
            syncOrder: 'ASC',
        }]);
    });

    it('should filter assets by SKU greater than a value', () => {
        const query = `USE WHERE sku > 100 END USE;`;
        const filterFunction = MKQL.parse<typeof IAssetSchema>(query, IAssetSchema);

        const filteredAssets = assets.filter(filterFunction);
        expect(filteredAssets).toEqual([
            { id: '1', name: 'Alice', ou: 'Sales', sku: 150, useSync: true, syncOrder: 'ASC' },
            { id: '2', name: 'Bob', ou: 'Marketing', sku: 200, useSync: false, syncOrder: 'DSC' },
        ]);
    });

    it('should filter assets by useSync', () => {
        const query = `USE WHERE useSync = false END USE;`;
        const filterFunction = MKQL.parse<typeof IAssetSchema>(query, IAssetSchema);

        const filteredAssets = assets.filter(filterFunction);
        expect(filteredAssets).toEqual([{
            id: '2',
            name: 'Bob',
            ou: 'Marketing',
            sku: 200,
            useSync: false,
            syncOrder: 'DSC',
        }]);
    });

    it('should combine filters with AND', () => {
        const query = `USE WHERE name = "Alice" AND sku > 100 END USE;`;
        const filterFunction = MKQL.parse<typeof IAssetSchema>(query, IAssetSchema);

        const filteredAssets = assets.filter(filterFunction);
        expect(filteredAssets).toEqual([{
            id: '1',
            name: 'Alice',
            ou: 'Sales',
            sku: 150,
            useSync: true,
            syncOrder: 'ASC',
        }]);
    });

    it('should combine filters with OR', () => {
        const query = `USE WHERE name = "Alice" OR sku < 100 END USE;`;
        const filterFunction = MKQL.parse<typeof IAssetSchema>(query, IAssetSchema);

        const filteredAssets = assets.filter(filterFunction);
        expect(filteredAssets).toEqual([
            { id: '1', name: 'Alice', ou: 'Sales', sku: 150, useSync: true, syncOrder: 'ASC' },
            { id: '3', name: 'Charlie', ou: 'Sales', sku: 50, useSync: true, syncOrder: 'ELSEWHERE' },
        ]);
    });

    it('should throw an error for invalid queries', () => {
        const invalidQueries = [
            `USE WHERE name = "Alice" AND END USE;`, // Invalid condition
            `USE WHERE name = "Alice" AND sku > "100" END USE;`, // Invalid type
            `USE WHERE name = "Alice" AND AND sku > 100 END USE;`, // Unexpected logical operator
            `USE WHERE name = "Alice" OR END USE;`, // Ends with logical operator
        ];

        for (const query of invalidQueries) {
            expect(() => MKQL.parse<typeof IAssetSchema>(query, IAssetSchema)).toThrow();
        }
    });
});