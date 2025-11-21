/**
 * Das Modul besteht aus der Klasse {@linkcode SchiffService}
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Schiff } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { type Pageable } from './pageable.js';
import { PrismaService } from './prisma-service.js';
import { type Slice } from './slice.js';
import { type Suchparameter, suchparameterNamen } from './suchparameter.js';
import { WhereBuilder } from './where-builder.js';

// Typdefinition für `findById`
type FindByIdParams = {
    // ID des gesuchten Schiffs
    readonly id: number;
};

/**
 * Die Klasse `SchiffService` implementiert das Lesen für Schiffe und greift
 * mit _Prisma_ auf eine relationale DB zu
 */
@Injectable()
export class SchiffService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #prisma: PrismaClient;
    readonly #whereBuilder: WhereBuilder;

    readonly #logger = getLogger(SchiffService.name);

    constructor(prisma: PrismaService, whereBuilder: WhereBuilder) {
        this.#prisma = prisma.client;
        this.#whereBuilder = whereBuilder;
    }

    /**
     * Ein Schiff asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Schiffs
     * @returns Das gefundene Schiff in einem Promise
     * @throws NotFoundException falls kein Schiff mit der ID existiert
     */
    async findById({ id }: FindByIdParams): Promise<Readonly<Schiff>> {
        this.#logger.debug('findById: id=%d', id);

        const schiff: Schiff | null = //TODO
            await this.#prisma.schiff.findUnique({
                where: { id },
            });
        if (schiff === null) {
            this.#logger.debug('Es gibt kein Schiff mit der ID %d', id);
            throw new NotFoundException(
                `Es gibt kein Schiff mit der ID ${id}.`,
            );
        }

        this.#logger.debug('findById: buch=%o', schiff);
        return schiff;
    }

    /**
     * Schiffe asynchron suchen
     * @param suchparameter JSON-Objekt mit Suchparameter
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer
     * @returns Ein JSON-Array mit den gefundenen Schiffen
     * @throws NotFoundException falls keine Schiffe gefunden wurden
     */
    async find(
        suchparameter: Suchparameter | undefined,
        pageable: Pageable,
    ): Promise<Readonly<Slice<Readonly<Schiff>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(suchparameter),
            pageable,
        );

        // Keine Suchparameter?
        if (suchparameter === undefined) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(suchparameter);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        if (!this.#checkKeys(keys)) {
            this.#logger.debug('Ungueltige Suchparameter');
            throw new NotFoundException('Ungueltige Suchparameter');
        }

        const where = this.#whereBuilder.build(suchparameter);
        const { number, size } = pageable;
        const schiffe: Schiff[] = await this.#prisma.schiff.findMany({
            where,
            skip: number * size,
            take: size,
        });
        if (schiffe.length === 0) {
            this.#logger.debug('find: Keine Schiffe gefunden');
            throw new NotFoundException(
                `Keine Schiffe gefunden: ${JSON.stringify(suchparameter)}, Seite ${pageable.number}}`,
            );
        }
        const totalElements = await this.count();
        return this.#createSlice(schiffe, totalElements);
    }

    /**
     * Anzahl aller Schiffe zurückliefern
     * @returns Ein JSON-Array mit den gefundenen Schiffen
     */
    async count() {
        this.#logger.debug('count');
        const count = await this.#prisma.schiff.count();
        this.#logger.debug('count: %d', count);
        return count;
    }

    async #findAll(pageable: Pageable): Promise<Readonly<Slice<Schiff>>> {
        const { number, size } = pageable;
        const schiffe: Schiff[] = await this.#prisma.schiff.findMany({
            skip: number * size,
            take: size,
        });
        if (schiffe.length === 0) {
            this.#logger.debug('#findAll: Keine Schiffe gefunden');
            throw new NotFoundException(`Ungueltige Seite "${number}"`);
        }
        const totalElements = await this.count();
        return this.#createSlice(schiffe, totalElements);
    }

    #createSlice(
        schiffe: Schiff[],
        totalElements: number,
    ): Readonly<Slice<Schiff>> {
        const schiffSlice: Slice<Schiff> = {
            content: schiffe,
            totalElements,
        };
        this.#logger.debug('createSlice: schiffSlice=%o', schiffSlice);
        return schiffSlice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%o', keys);
        let validKeys = true;
        keys.forEach((key) => {
            if (!suchparameterNamen.includes(key)) {
                this.#logger.debug(
                    '#checkKeys: ungueltiger Suchparameter "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
