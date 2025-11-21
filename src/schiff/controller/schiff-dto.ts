/**
 * Das Modul besteht aus der Entity-Klasse
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file, @typescript-eslint/no-magic-numbers */

import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    Matches,
    Max,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { KisteDTO } from './kiste-dto.js';
import { OffizierDTO } from './offizier-dto.js';

const toNumber = ({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return;
    const n =
        typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : undefined; // auf 2 Nachkommastellen runden (passend zu DECIMAL(5,2))
};

/**
 * Entity-Klasse für Schiffe
 */
export class SchiffDTO {
    @Matches(String.raw`^\w.*`)
    @MaxLength(30)
    readonly name!: string;

    @Transform(toNumber)
    @Max(500)
    readonly laenge!: number;

    @ValidateNested()
    @Type(() => OffizierDTO)
    readonly offizier!: OffizierDTO; // NOSONAR

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KisteDTO)
    readonly kisten: KisteDTO[] | undefined;
}
/* eslint-enable max-classes-per-file, @typescript-eslint/no-magic-numbers */
