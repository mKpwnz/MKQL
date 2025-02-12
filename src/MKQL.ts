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

type Operator = '=' | '!=' | '~' | '>' | '<';
type LogicalOperator = 'AND' | 'OR';

interface Filter<T> {
    key: keyof T;
    operator: Operator;
    value: any; // Hier ist der Typ any, da wir die Typen zur Laufzeit überprüfen
}

export class MKQL {
    static parse<T extends z.ZodObject<any>>(query: string, schema: T): (item: z.infer<T>) => boolean {
        this.validateQuery<T>(query, schema);

        const filters: (Filter<z.infer<T>> | LogicalOperator)[] = [];
        const regex = /USE WHERE (.+?) END USE;?/g;
        let match;

        while ((match = regex.exec(query)) !== null) {
            const conditions = match[1].split(/ (AND|OR) /).map(cond => cond.trim());
            let currentFilter: Filter<z.infer<T>> | null = null;

            for (const condition of conditions) {
                if (condition === 'AND' || condition === 'OR') {
                    if (currentFilter) {
                        filters.push(currentFilter);
                    }
                    filters.push(condition as LogicalOperator);
                    currentFilter = null;
                } else {
                    const [key, operator, value] = this.parseCondition<z.infer<T>>(condition);
                    if (key) {
                        const filter: Filter<z.infer<T>> = { key, operator, value };
                        currentFilter = filter;
                    }
                }
            }
            if (currentFilter) {
                filters.push(currentFilter);
            }
        }

        return (item: z.infer<T>) => {
            let result = true;
            let currentLogical: LogicalOperator | null = null;

            for (const filter of filters) {
                if (typeof filter === 'string') {
                    currentLogical = filter;
                } else {
                    const { key, operator, value } = filter;
                    const itemValue = item[key];

                    let conditionResult: boolean;
                    switch (operator) {
                        case '=':
                            conditionResult = itemValue === value;
                            break;
                        case '!=':
                            conditionResult = itemValue !== value;
                            break;
                        case '~':
                            conditionResult = typeof itemValue === 'string' && itemValue.includes(value as string);
                            break;
                        case '>':
                            conditionResult = this.isNumber(itemValue) && this.isNumber(value) && itemValue > value;
                            break;
                        case '<':
                            conditionResult = this.isNumber(itemValue) && this.isNumber(value) && itemValue < value;
                            break;
                        default:
                            conditionResult = false;
                    }

                    // Combine results based on the logical operator
                    if (currentLogical === 'AND') {
                        result = result && conditionResult;
                    } else if (currentLogical === 'OR') {
                        result = result || conditionResult;
                    } else {
                        result = conditionResult;
                    }
                }
            }

            return result;
        };
    }

    private static validateQuery<T extends z.ZodObject<any>>(query: string, schema: T): void {
        const regex = /USE WHERE (.+?) END USE;?/g;
        const match = regex.exec(query);

        if (!match) {
            throw new Error('Query must start with \'USE WHERE\' and end with \'END USE\'.');
        }

        const conditions = match[1].split(/ (AND|OR) /).map(cond => cond.trim());
        let expectingCondition = true;

        for (const condition of conditions) {
            if (condition === 'AND' || condition === 'OR') {
                if (expectingCondition) {
                    throw new Error(`Unexpected logical operator: ${condition}.`);
                }
                expectingCondition = true;
            } else {
                const [key, operator, value] = this.parseCondition<z.infer<T>>(condition);
                if (!this.isValidOperatorForValue<T>(key, operator, value, schema)) {
                    throw new Error(`Invalid operator '${operator}' for value '${value}'.`);
                }
                expectingCondition = false;
            }
        }

        if (expectingCondition) {
            throw new Error('Query cannot end with a logical operator.');
        }
    }

    private static isValidOperatorForValue<T extends z.ZodObject<any>>(key: keyof z.infer<T>, operator: Operator, value: any, schema: T): boolean {
        try {
            // Erstellen eines Schemas nur für den spezifischen Schlüssel
            const partialSchema = z.object({ [key]: schema.shape[key as keyof z.infer<T>] });

            // Versuchen, das Objekt mit dem partiellen Zod-Schema zu parsen
            partialSchema.parse({ [key]: value });
            return true; // Wenn das Parsen erfolgreich ist, ist der Operator gültig
        } catch (error: any) {
            // Wenn ein Fehler auftritt, ist der Operator ungültig
            console.error('Validation error:', error.errors); // Log the Zod errors
            return false;
        }
    }

    private static parseCondition<T>(condition: string): [keyof T, Operator, any] {
        const regex = /(\w+)\s*([!=~><]+)\s*(.+)/;
        const match = condition.match(regex);
        if (match) {
            const key = match[1] as keyof T;
            const operator = match[2] as Operator;
            const value = this.parseValue(match[3]);
            return [key, operator, value];
        }
        throw new Error(`Invalid condition: ${condition}`);
    }

    private static parseValue(value: string): string | number | boolean | null | undefined {
        if (value === 'null') return null;
        if (value === 'undefined') return undefined;
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(Number(value))) return Number(value);
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1); // Remove quotes
        }
        return value; // Return as is
    }

    private static isNumber(value: any): value is number {
        return typeof value === 'number' && !isNaN(value);
    }
}

// Beispielverwendung
const assets: IAsset[] = [
    { id: '1', name: 'Alice', ou: 'Sales', sku: 150, useSync: true, syncOrder: 'ASC' },
    { id: '2', name: 'Bob', ou: 'Marketing', sku: 200, useSync: false, syncOrder: 'DSC' },
    { id: '3', name: 'Charlie', ou: 'Sales', sku: 50, useSync: true, syncOrder: 'ELSEWHERE' },
];

const query = `USE WHERE name = "Alice" AND sku > 100 OR useSync=false END USE;`;
try {
    const filterFunction = MKQL.parse<typeof IAssetSchema>(query, IAssetSchema);
    const filteredAssets = assets.filter(filterFunction);
    console.log(filteredAssets);
} catch (error) {
    console.error(error);
}
