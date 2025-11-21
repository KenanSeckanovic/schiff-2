/**
 * Das Modul besteht aus der Entity-Klasse
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { IsOptional, Matches, Max, MaxLength, Min } from 'class-validator';

/**
 * Entity-Klasse für Offizier
 */
export class OffizierDTO {
    @Matches(String.raw`^\w.*`)
    @MaxLength(20)
    readonly name!: string;

    @IsOptional()
    @Min(30)
    @Max(70)
    readonly alter?: number;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
