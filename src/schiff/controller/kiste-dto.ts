/**
 * Das Modul besteht aus der Entity-Klasse
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { Transform } from 'class-transformer';
import { Max } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return;
    const n =
        typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : undefined; // auf 2 Nachkommastellen runden (passend zu DECIMAL(5,2))
};

/**
 * Entity-Klasse für Kiste
 */
export class KisteDTO {
    @Transform(toNumber)
    @Max(10.0)
    readonly hoehe!: number;

    @Transform(toNumber)
    @Max(20.0)
    readonly laenge!: number;

    @Transform(toNumber)
    @Max(10.0)
    readonly breite!: number;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
